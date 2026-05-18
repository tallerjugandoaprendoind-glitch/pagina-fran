'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Loader2, MessageCircle, CreditCard, X } from 'lucide-react'

declare global {
  interface Window {
    Culqi?: any
    culqi?: () => void
    paypal?: any
  }
}

type Props = {
  courseId: string
  courseTitle: string
  price: number
  priceLabel?: string
  userEmail: string
  waUrl: string
}

type Step = 'idle' | 'selecting' | 'processing' | 'error'

export default function BuyButton({
  courseId,
  courseTitle,
  price,
  priceLabel,
  userEmail,
  waUrl,
}: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [culqiReady, setCulqiReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paypalContainerRef = useRef<HTMLDivElement>(null)
  const paypalRendered = useRef(false)

  // ─── Cargar script de Culqi ───────────────────────────────────────────────
  useEffect(() => {
    if (window.Culqi) { setCulqiReady(true); return }

    if (document.getElementById('culqi-script')) {
      const iv = setInterval(() => {
        if (window.Culqi) { setCulqiReady(true); clearInterval(iv) }
      }, 100)
      return () => clearInterval(iv)
    }

    const s = document.createElement('script')
    s.id = 'culqi-script'
    s.src = 'https://checkout.culqi.com/js/v4'
    s.async = true
    s.onload = () => {
      const iv = setInterval(() => {
        if (window.Culqi) { setCulqiReady(true); clearInterval(iv) }
      }, 100)
      setTimeout(() => clearInterval(iv), 5000)
    }
    document.body.appendChild(s)
  }, [])

  // ─── Cargar y renderizar botones de PayPal cuando se abre el selector ─────
  useEffect(() => {
    if (step !== 'selecting' || paypalRendered.current) return

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) return

    const renderButtons = () => {
      if (!window.paypal || !paypalContainerRef.current) return
      paypalContainerRef.current.innerHTML = ''

      window.paypal
        .Buttons({
          style: {
            layout: 'horizontal',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 44,
            tagline: false,
          },
          createOrder: async () => {
            const res = await fetch('/api/payments/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ courseId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al crear la orden')
            return data.orderId
          },
          onApprove: async (data: { orderID: string }) => {
            setStep('processing')
            try {
              const res = await fetch('/api/payments/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: data.orderID, courseId }),
              })
              const result = await res.json()
              if (!res.ok) {
                setError(result.error || 'Error al confirmar el pago con PayPal')
                setStep('error')
              } else {
                window.location.href = `/learn/${courseId}`
              }
            } catch {
              setError('Error de conexión con PayPal. Intenta de nuevo.')
              setStep('error')
            }
          },
          onError: () => {
            setError('Ocurrió un error con PayPal. Intenta con tarjeta.')
            setStep('error')
          },
          onCancel: () => {
            // El usuario cerró el popup de PayPal sin pagar → volver al selector
            setStep('selecting')
          },
        })
        .render(paypalContainerRef.current)

      paypalRendered.current = true
    }

    if (window.paypal) {
      renderButtons()
      return
    }

    if (document.getElementById('paypal-script')) {
      const iv = setInterval(() => {
        if (window.paypal) { renderButtons(); clearInterval(iv) }
      }, 200)
      return () => clearInterval(iv)
    }

    const s = document.createElement('script')
    s.id = 'paypal-script'
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`
    s.async = true
    s.onload = renderButtons
    document.body.appendChild(s)
  }, [step, courseId])

  // Resetear flag cuando se cierra el selector para re-renderizar si vuelve a abrirse
  useEffect(() => {
    if (step !== 'selecting') paypalRendered.current = false
  }, [step])

  // ─── Flujo Culqi ─────────────────────────────────────────────────────────
  function handleCulqi() {
    if (!culqiReady || !window.Culqi) return
    setError(null)

    const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
    if (!publicKey) {
      setError('Culqi no está configurado. Contacta al administrador.')
      setStep('error')
      return
    }

    window.Culqi.publicKey = publicKey
    window.Culqi.settings({
      title: 'CapyABA',
      currency: 'PEN',
      description: courseTitle,
      amount: Math.round(price * 100),
    })

    window.culqi = async function () {
      if (window.Culqi?.token) {
        const token = window.Culqi.token.id
        window.Culqi.close()
        setStep('processing')

        try {
          const res = await fetch('/api/payments/culqi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, token, email: userEmail }),
          })
          const data = await res.json()

          if (!res.ok) {
            setError(data.error || 'Error al procesar el pago')
            setStep('error')
          } else {
            window.location.href = `/learn/${courseId}`
          }
        } catch {
          setError('Error de conexión. Por favor intenta de nuevo.')
          setStep('error')
        }
      } else {
        // El usuario cerró el popup de Culqi sin pagar
        setStep('selecting')
      }
    }

    window.Culqi.open()
  }

  const displayPrice = priceLabel ?? `S/ ${price.toFixed(2)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#FFF0F0', border: '1px solid #FFB3B3', borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: '#C0392B', lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* ── Selector de método de pago ── */}
      {step === 'selecting' && (
        <div style={{
          border: '1.5px solid #E8DDD3',
          borderRadius: 14,
          padding: '14px 14px 12px',
          background: '#FDFAF8',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Encabezado */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#8B6F52', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ¿Cómo quieres pagar?
            </span>
            <button
              onClick={() => setStep('idle')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 2, lineHeight: 1 }}
              aria-label="Cerrar"
            >
              <X size={15} />
            </button>
          </div>

          {/* Botón Culqi (tarjeta) */}
          <button
            onClick={handleCulqi}
            disabled={!culqiReady}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 16px',
              background: culqiReady ? '#5F4D36' : '#9E8C7A',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
              cursor: culqiReady ? 'pointer' : 'not-allowed',
              transition: 'background .15s',
            }}
          >
            {culqiReady
              ? <><CreditCard size={15} /> Tarjeta de crédito / débito</>
              : <><Loader2 size={15} className="animate-spin" /> Cargando...</>
            }
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: '#bbb',
          }}>
            <div style={{ flex: 1, height: 1, background: '#E8DDD3' }} />
            o
            <div style={{ flex: 1, height: 1, background: '#E8DDD3' }} />
          </div>

          {/* Contenedor del botón de PayPal (renderizado por el SDK) */}
          <div ref={paypalContainerRef} style={{ minHeight: 44 }} />
        </div>
      )}

      {/* ── Botón principal "Comprar" ── */}
      {step !== 'selecting' && (
        <button
          onClick={() => { setError(null); setStep('selecting') }}
          disabled={step === 'processing'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '13px 20px',
            background: step === 'processing' ? '#9E8C7A' : '#5F4D36',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 800,
            cursor: step === 'processing' ? 'not-allowed' : 'pointer',
            transition: 'background .15s',
            letterSpacing: '-0.01em',
          }}
        >
          {step === 'processing'
            ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
            : <><ShoppingCart size={16} /> Comprar · {displayPrice}</>
          }
        </button>
      )}

      {/* ── WhatsApp ── */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          width: '100%', padding: '10px 20px',
          background: 'transparent', border: '1.5px solid #25D366',
          borderRadius: 12, fontSize: 13, fontWeight: 700,
          color: '#1A9E50', textDecoration: 'none',
        }}
      >
        <MessageCircle size={14} />
        Consultar por WhatsApp
      </a>
    </div>
  )
}
