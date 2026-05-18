'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, CreditCard, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Course {
  id: string
  title: string
  price: number
  price_label?: string
}

interface PaymentModalProps {
  course: Course
  onClose: () => void
  onSuccess: () => void
}

type PaymentMethod = 'paypal' | 'culqi'
type ModalStep = 'select' | 'processing' | 'success' | 'error'

// ─── PayPal Button Component ──────────────────────────────────────────────────

declare global {
  interface Window {
    paypal?: any
    Culqi?: any
    culqi?: any
  }
}

function PayPalButton({
  course,
  onSuccess,
  onError,
}: {
  course: Course
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.paypal) {
      setReady(true)
      return
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) {
      onError('PayPal no está configurado. Contáctanos por WhatsApp.')
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => onError('No se pudo cargar PayPal. Intenta con Culqi.')
    document.body.appendChild(script)

    return () => {
      // Cleanup solo si el script aún está en el DOM
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !window.paypal) return

    const container = document.getElementById('paypal-button-container')
    if (!container || container.children.length > 0) return

    window.paypal
      .Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'pay',
        },
        createOrder: async () => {
          const res = await fetch('/api/payments/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId: course.id }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Error al crear orden')
          return data.orderId
        },
        onApprove: async (data: { orderID: string }) => {
          const res = await fetch('/api/payments/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID, courseId: course.id }),
          })
          const result = await res.json()
          if (!res.ok) {
            onError(result.error || 'Error al confirmar el pago')
          } else {
            onSuccess()
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err)
          onError('Ocurrió un error con PayPal. Intenta de nuevo o usa Culqi.')
        },
      })
      .render('#paypal-button-container')
  }, [ready, course.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando PayPal…
      </div>
    )
  }

  return <div id="paypal-button-container" className="w-full" />
}

// ─── Culqi Button Component ───────────────────────────────────────────────────

function CulqiButton({
  course,
  userEmail,
  onSuccess,
  onError,
  onProcessing,
}: {
  course: Course
  userEmail: string
  onSuccess: () => void
  onError: (msg: string) => void
  onProcessing: () => void
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.Culqi) {
      setReady(true)
      return
    }

    const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
    if (!publicKey) {
      onError('Culqi no está configurado.')
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.culqi.com/js/v4'
    script.async = true
    script.onload = () => {
      window.Culqi?.publicKey && (window.Culqi.publicKey = publicKey)
      setReady(true)
    }
    script.onerror = () => onError('No se pudo cargar Culqi.')
    document.body.appendChild(script)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCulqi = useCallback(() => {
    const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
    if (!publicKey || !window.Culqi) {
      onError('Culqi no disponible.')
      return
    }

    window.Culqi.publicKey = publicKey
    window.Culqi.settings({
      title: 'CapyABA',
      currency: 'PEN',
      amount: Math.round(course.price * 100), // en céntimos
      description: course.title,
      order: course.id,
    })

    // Callback que Culqi llama con el token
    window.culqi = async () => {
      if (window.Culqi.token) {
        onProcessing()
        const res = await fetch('/api/payments/culqi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            token: window.Culqi.token.id,
            email: userEmail,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          onError(data.error || 'Error al procesar el pago con Culqi')
        } else {
          onSuccess()
        }
      } else if (window.Culqi.order) {
        // Cuotas — manejar si aplica
        console.log('Culqi order:', window.Culqi.order)
      } else {
        onError('No se recibió token de Culqi.')
      }
    }

    window.Culqi.open()
  }, [course, userEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      onClick={handleCulqi}
      disabled={!ready}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white transition-all
        bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700
        disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
    >
      {!ready ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando…
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          Pagar S/ {Number(course.price).toFixed(2)} con tarjeta
        </>
      )}
    </button>
  )
}

// ─── Modal Principal ──────────────────────────────────────────────────────────

export default function PaymentModal({ course, onClose, onSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('paypal')
  const [step, setStep] = useState<ModalStep>('select')
  const [errorMsg, setErrorMsg] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Obtener email del usuario al montar
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => d.email && setUserEmail(d.email))
      .catch(() => {})
  }, [])

  const handleSuccess = useCallback(() => {
    setStep('success')
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }, [onSuccess])

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg)
    setStep('error')
  }, [])

  const priceDisplay = course.price_label || `S/ ${Number(course.price).toFixed(2)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-mocha-700 to-mocha-900 px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold tracking-tight mb-0.5">Comprar curso</h2>
          <p className="text-mocha-200 text-sm line-clamp-1">{course.title}</p>
          <div className="mt-3 text-3xl font-black">{priceDisplay}</div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── Estado: selección de método ── */}
          {step === 'select' && (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-5">
                <button
                  onClick={() => setMethod('paypal')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition ${
                    method === 'paypal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  PayPal
                </button>
                <button
                  onClick={() => setMethod('culqi')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition ${
                    method === 'culqi'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Tarjeta (Culqi)
                </button>
              </div>

              {method === 'paypal' && (
                <div>
                  <p className="text-xs text-gray-500 mb-4 text-center">
                    Paga de forma segura con tu cuenta PayPal o tarjeta. El cargo es en USD.
                  </p>
                  <PayPalButton
                    course={course}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                </div>
              )}

              {method === 'culqi' && (
                <div>
                  <p className="text-xs text-gray-500 mb-4 text-center">
                    Paga con Visa, Mastercard u otras tarjetas. El cargo es en Soles (PEN).
                  </p>
                  <CulqiButton
                    course={course}
                    userEmail={userEmail}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onProcessing={() => setStep('processing')}
                  />
                </div>
              )}

              {/* Trust badge */}
              <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                Pago 100% seguro y encriptado
              </div>
            </>
          )}

          {/* ── Estado: procesando ── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="w-12 h-12 text-mocha-600 animate-spin" />
              <p className="font-semibold text-gray-700">Procesando tu pago…</p>
              <p className="text-sm text-gray-400">No cierres esta ventana</p>
            </div>
          )}

          {/* ── Estado: éxito ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              <p className="text-xl font-bold text-gray-800">¡Pago exitoso!</p>
              <p className="text-sm text-gray-500 text-center">
                Ya tienes acceso al curso. Redirigiendo…
              </p>
            </div>
          )}

          {/* ── Estado: error ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-base font-semibold text-gray-800 text-center">{errorMsg}</p>
              <button
                onClick={() => setStep('select')}
                className="px-6 py-2 rounded-lg bg-mocha-700 text-white font-semibold hover:bg-mocha-800 transition"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
