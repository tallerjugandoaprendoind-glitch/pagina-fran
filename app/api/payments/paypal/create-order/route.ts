import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

/** Obtiene un Access Token de PayPal usando Client Credentials */
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal token error: ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

// ────────────────────────────────────────────────
// POST /api/payments/paypal/create-order
// Body: { courseId: string }
// Crea una orden de PayPal y devuelve el orderID
// ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { courseId } = await req.json()
  if (!courseId) {
    return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 })
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Obtener el curso
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

  // Verificar si ya está matriculado
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Ya tienes acceso a este curso' }, { status: 409 })
  }

  // Crear orden en PayPal (en USD — ajusta si quieres PEN)
  // PayPal no soporta PEN directamente, se usa USD
  const token = await getPayPalToken()

  const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: courseId,
          description: `CapyABA – ${course.title}`,
          amount: {
            currency_code: 'USD',
            value: Number(course.price).toFixed(2),
          },
          custom_id: `${user.id}|${courseId}`, // para el webhook
        },
      ],
      application_context: {
        brand_name: 'CapyABA',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    }),
  })

  const orderData = await orderRes.json()

  if (!orderRes.ok) {
    console.error('PayPal create-order error:', orderData)
    return NextResponse.json(
      { error: 'Error al crear la orden en PayPal' },
      { status: 500 }
    )
  }

  return NextResponse.json({ orderId: orderData.id })
}
