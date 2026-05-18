import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

/**
 * POST /api/payments/culqi
 * Body: { courseId: string, token: string }
 *
 * 1. Verifica que el curso exista y tenga precio
 * 2. Cobra con Culqi usando el token del frontend
 * 3. Si el cargo es exitoso, crea el enrollment del alumno
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { courseId, token, email } = await req.json()
  if (!courseId || !token) {
    return NextResponse.json({ error: 'courseId y token son requeridos' }, { status: 400 })
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Obtener el curso y su precio
  const { data: course, error: courseError } = await adminClient
    .from('courses')
    .select('id, title, price, is_published')
    .eq('id', courseId)
    .eq('is_published', true)
    .single()

  if (courseError || !course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }
  if (!course.price || course.price <= 0) {
    return NextResponse.json({ error: 'Este curso no tiene precio configurado' }, { status: 400 })
  }

  // Verificar que no esté ya matriculado
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .single()

  if (existingEnrollment) {
    return NextResponse.json({ error: 'Ya tienes acceso a este curso' }, { status: 409 })
  }

  // Culqi requiere el monto en céntimos (soles × 100)
  const amountCentimos = Math.round(course.price * 100)

  const culqiResponse = await fetch('https://api.culqi.com/v2/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CULQI_SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount: amountCentimos,
      currency_code: 'PEN',
      email: email || user.email,
      source_id: token,
      description: `CapyABA – ${course.title}`,
      metadata: {
        course_id: courseId,
        user_id: user.id,
      },
    }),
  })

  const culqiData = await culqiResponse.json()

  if (!culqiResponse.ok || culqiData.object === 'error') {
    const msg = culqiData?.user_message || culqiData?.merchant_message || 'Error al procesar el pago'
    return NextResponse.json({ error: msg }, { status: 402 })
  }

  // Pago exitoso → crear enrollment
  const { error: enrollError } = await adminClient
    .from('enrollments')
    .insert({
      course_id: courseId,
      student_id: user.id,
      status: 'active',
      payment_id: culqiData.id,
      paid_amount: course.price,
      payment_method: 'culqi',
    })

  if (enrollError) {
    console.error('ENROLLMENT ERROR after successful charge:', enrollError, culqiData.id)
    return NextResponse.json(
      { error: 'Pago procesado pero hubo un error al activar el curso. Contáctanos a capyaba@gmail.com con tu comprobante.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    chargeId: culqiData.id,
    courseId,
  })
}
