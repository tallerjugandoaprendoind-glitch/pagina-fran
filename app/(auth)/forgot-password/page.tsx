'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CapyLogoText } from '@/components/ui/CapyLogo'
import { Mail, ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import '../auth.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError('No pudimos enviar el correo. Verifica que la dirección sea correcta.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      {/* ── Formulario ── */}
      <div className="auth-left">
        <Link href="/" style={{ display: 'inline-block' }}>
          <CapyLogoText size="md" />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-form-card">

            <Link href="/login" className="back-link">
              <ArrowLeft style={{ width: 15, height: 15 }} />
              Volver al inicio de sesión
            </Link>

            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '6px', letterSpacing: '-.02em' }}>
              Recuperar contraseña
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>

            {error && (
              <div className="auth-error">
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {sent ? (
              <div className="auth-success">
                <CheckCircle style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>¡Correo enviado!</p>
                  <p style={{ margin: 0 }}>
                    Revisa tu bandeja de entrada en <strong>{email}</strong>. El enlace expira en 1 hora.
                    Si no lo ves, revisa tu carpeta de spam.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="auth-label">Correo electrónico</label>
                  <div className="auth-input-wrap">
                    <Mail className="auth-input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input"
                      placeholder="tu@correo.com"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="auth-submit" style={{ marginTop: '4px' }}>
                  {loading ? 'Enviando...' : (
                    <>Enviar enlace <ArrowRight style={{ width: 16, height: 16 }} /></>
                  )}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '24px' }}>
              ¿Recordaste tu contraseña?{' '}
              <Link href="/login" className="auth-link">Ingresar</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Video ── */}
      <div className="auth-right">
        <video ref={videoRef} src="/video/capy-login.mp4" className="auth-video"
          autoPlay muted loop playsInline preload="auto" />
        <div className="auth-overlay" />
        <div className="auth-tagline">
          <h2>No te preocupes,<br />Capy te ayuda</h2>
          <p>Pasa, te enviamos un enlace seguro para que puedas volver a tu aprendizaje en minutos.</p>
        </div>
      </div>
    </div>
  )
}
