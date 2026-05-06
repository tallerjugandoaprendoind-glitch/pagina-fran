'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CapyLogoText } from '@/components/ui/CapyLogo'
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import '../auth.css'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const passwordStrong = password.length >= 8
  const passwordsMatch = password === confirm && confirm.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!passwordStrong) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('No pudimos actualizar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 3000)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <Link href="/" style={{ display: 'inline-block' }}>
          <CapyLogoText size="md" />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-form-card">
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '6px', letterSpacing: '-.02em' }}>
              Nueva contraseña
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
              Elige una contraseña segura para tu cuenta.
            </p>

            {!sessionReady && !success && (
              <div className="warning-box">
                ⏳ Verificando tu enlace de recuperación... Si esta página no carga en unos segundos,
                vuelve al correo y haz clic nuevamente en el enlace.
              </div>
            )}

            {error && (
              <div className="auth-error">
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="auth-success">
                <CheckCircle style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>¡Contraseña actualizada!</p>
                  <p style={{ margin: 0 }}>
                    Tu contraseña fue cambiada correctamente. Serás redirigido al dashboard en un momento.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="auth-label">Nueva contraseña</label>
                  <div className="auth-input-wrap">
                    <Lock className="auth-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null) }}
                      className={`auth-input has-toggle${password.length > 0 ? (passwordStrong ? ' valid' : ' invalid') : ''}`}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(v => !v)}>
                      {showPassword
                        ? <EyeOff style={{ width: 16, height: 16 }} />
                        : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <p className={`auth-hint ${passwordStrong ? 'ok' : 'warn'}`}>
                      {passwordStrong ? '✓ Longitud correcta' : `Faltan ${8 - password.length} caracteres`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="auth-label">Confirmar contraseña</label>
                  <div className="auth-input-wrap">
                    <Lock className="auth-input-icon" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(null) }}
                      className={`auth-input has-toggle${confirm.length > 0 ? (passwordsMatch ? ' valid' : ' invalid') : ''}`}
                      placeholder="Repite tu contraseña"
                      required
                    />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm
                        ? <EyeOff style={{ width: 16, height: 16 }} />
                        : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  {confirm.length > 0 && (
                    <p className={`auth-hint ${passwordsMatch ? 'ok' : 'warn'}`}>
                      {passwordsMatch ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !sessionReady || !passwordStrong || !passwordsMatch}
                  className="auth-submit"
                  style={{ marginTop: '4px' }}
                >
                  {loading ? 'Guardando...' : (
                    <>Guardar contraseña <ArrowRight style={{ width: 16, height: 16 }} /></>
                  )}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '24px' }}>
              <Link href="/login" className="auth-link">Volver al inicio de sesión</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right auth-right-solid">
        <div className="auth-right-inner">
          <div className="capy-icon">🔐</div>
          <h2>Casi listo,<br />ya casi vuelves</h2>
          <p>Una nueva contraseña segura y Capy te estará esperando para seguir aprendiendo juntos.</p>
        </div>
      </div>
    </div>
  )
}
