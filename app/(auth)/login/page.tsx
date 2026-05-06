'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CapyLogoText } from '@/components/ui/CapyLogo'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import '../auth.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {})
  }, [])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError('Correo o contraseña incorrectos'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').single()
    router.push(profile?.role === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) { setError('Error al iniciar con Google'); setGoogleLoading(false) }
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
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '6px', letterSpacing: '-.02em' }}>
              Bienvenido de vuelta
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
              Continúa tu aprendizaje donde lo dejaste
            </p>

            {error && (
              <div className="auth-error">
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button onClick={handleGoogleLogin} disabled={googleLoading || loading} className="auth-google-btn" style={{ marginBottom: '4px' }}>
              <GoogleIcon />
              {googleLoading ? 'Conectando...' : 'Continuar con Google'}
            </button>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">o</span>
              <div className="auth-divider-line" />
            </div>

            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="auth-label">Correo electrónico</label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="auth-input" placeholder="tu@correo.com" required />
                </div>
              </div>

              <div>
                <label className="auth-label">Contraseña</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="auth-input" placeholder="••••••••" required minLength={6} />
                </div>
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <Link href="/forgot-password" className="auth-link" style={{ fontSize: '12px' }}>¿Olvidaste?</Link>
                </div>
              </div>

              <button type="submit" disabled={loading || googleLoading} className="auth-submit" style={{ marginTop: '4px' }}>
                {loading ? 'Ingresando...' : (<>Ingresar <ArrowRight style={{ width: 16, height: 16 }} /></>)}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '24px' }}>
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="auth-link">Regístrate gratis</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Video ── */}
      <div className="auth-right">
        <video ref={videoRef} src="/video/capy-login.mp4" className="auth-video"
          autoPlay muted loop playsInline preload="auto" />
        <div className="auth-overlay" />
        <div className="auth-badge">
          <span className="auth-badge-dot" />
          <span className="auth-badge-text">🎓 Más de 100 estudiantes aprendiendo</span>
        </div>
        <div className="auth-tagline">
          <h2>Aprende ABA a tu ritmo,<br />con Capy a tu lado</h2>
          <p>Capy te está esperando para seguir aprendiendo juntos. Tranquilo, a tu ritmo.</p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
