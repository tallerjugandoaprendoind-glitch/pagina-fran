import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

async function getPayPalToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  return data.access_token
}

// ────────────────────────────────────────────────
// POST /api/payments/paypal/capture-order
// Body: { orderId: string, courseId: string }
// Captura el pago y crea el enrollment
// ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { orderId, courseId } = await req.json()
  if (!orderId || !courseId) {
    return NextResponse.json(
      { error: 'orderId y courseId son requeridos' },
      { status: 400 }
    )
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Capturar el pago en PayPal
  const token = await getPayPalToken()

  const captureRes = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const captureData = await captureRes.json()

  if (!captureRes.ok || captureData.status !== 'COMPLETED') {
    console.error('PayPal capture error:', captureData)
    return NextResponse.json(
      { error: 'El pago no pudo ser completado en PayPal' },
      { status: 402 }
    )
  }

  // ── CORRECCIÓN DE SEGURIDAD: verificar que el courseId del body
  //    coincida con el reference_id que se guardó al crear la orden.
  //    Evita que alguien cree una orden para el curso A y luego
  //    envíe courseId del curso B para obtener acceso sin pagar. ────────────
  const orderReferenceId = captureData.purchase_units?.[0]?.reference_id
  if (orderReferenceId !== courseId) {
    console.error('PayPal courseId mismatch:', { orderReferenceId, courseId, orderId, userId: user.id })
    return NextResponse.json(
      { error: 'La orden no corresponde al curso indicado' },
      { status: 400 }
    )
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Extraer monto capturado
  const captureUnit = captureData.purchase_units?.[0]
  const capture = captureUnit?.payments?.captures?.[0]
  const paidAmount = parseFloat(capture?.amount?.value || '0')
  const paypalPaymentId = capture?.id || orderId

  // Log del pago (la tabla payment_logs debe existir — ver migración)
  await adminClient.from('payment_logs').insert({
    user_id: user.id,
    course_id: courseId,
    provider: 'paypal',
    provider_payment_id: paypalPaymentId,
    amount: paidAmount,
    currency: 'USD',
    status: 'completed',
    raw_response: captureData,
  })

  // Verificar que no esté ya matriculado (idempotencia)
  const { data: existingEnrollment } = await adminClient
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .single()

  if (existingEnrollment) {
    // Pago duplicado pero enrollment ya existe — responder OK para no bloquear al usuario
    return NextResponse.json({ success: true, paymentId: paypalPaymentId, courseId })
  }

  // Crear enrollment
  const { error: enrollError } = await adminClient.from('enrollments').insert({
    course_id: courseId,
    student_id: user.id,
    status: 'active',
    payment_id: paypalPaymentId,
    paid_amount: paidAmount,
    payment_method: 'paypal',
  })

  if (enrollError) {
    console.error('ENROLLMENT ERROR after PayPal capture:', enrollError, paypalPaymentId)
    return NextResponse.json(
      {
        error:
          'Pago recibido pero hubo un error al activar el curso. Contáctanos a capyaba@gmail.com con tu comprobante de PayPal.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    paymentId: paypalPaymentId,
    courseId,
  })
}
