'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CapyLogoText, CapyMascot } from '@/components/ui/CapyLogo'
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import '../auth.css'

const PERKS = [
  { title: 'Cursos asignados por tu instructor', desc: 'Acceso personalizado según tu plan de aprendizaje' },
  { title: 'Certificado', desc: 'Lo obtendras al aprobar tu curso' },
  { title: 'Aprende a tu ritmo', desc: 'Pausa, retoma y avanza sin presión' },
  { title: 'Evaluaciones automáticas', desc: 'Recibe tu nota al instante' },
]

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1500)
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) { setError('Error al registrarse con Google'); setGoogleLoading(false) }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf7f4', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#fff', borderRadius: '20px', padding: '48px 40px', border: '1px solid #e5e7eb', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <CapyMascot size={120} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>¡Cuenta creada! 🎉</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
            Bienvenido a CapyABA. Tu instructor te asignará los cursos disponibles.<br />Redirigiendo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      {/* ── Formulario ── */}
      <div className="auth-left">
        <Link href="/" style={{ display: 'inline-block' }}>
          <CapyLogoText size="md" />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '380px', width: '100%' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '6px', letterSpacing: '-.02em' }}>
              Crea tu cuenta
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
              Empieza en minutos, es gratis
            </p>

            {error && (
              <div className="auth-error">
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button onClick={handleGoogleSignup} disabled={googleLoading || loading} className="auth-google-btn">
              <GoogleIcon />
              {googleLoading ? 'Conectando...' : 'Registrarme con Google'}
            </button>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">o</span>
              <div className="auth-divider-line" />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="auth-label">Nombre completo</label>
                <div className="auth-input-wrap">
                  <User className="auth-input-icon" />
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="auth-input" placeholder="Juan Pérez" required />
                </div>
              </div>
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
                    className="auth-input" placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
              </div>
              <button type="submit" disabled={loading || googleLoading} className="auth-submit" style={{ marginTop: '4px' }}>
                {loading ? 'Creando cuenta...' : (<>Crear cuenta gratis <ArrowRight style={{ width: 16, height: 16 }} /></>)}
              </button>
            </form>

            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
              Al registrarte aceptas nuestros términos. Los cursos se activan cuando tu instructor te los asigna.
            </p>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '20px' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="auth-link">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Video con perks ── */}
      <div className="auth-right">
        <video ref={videoRef} src="/video/capy-login.mp4" className="auth-video"
          autoPlay muted loop playsInline preload="auto" />
        <div className="auth-overlay" />
        <div className="auth-badge">
          <span className="auth-badge-dot" />
          <span className="auth-badge-text">🎓 Más de 100 estudiantes aprendiendo</span>
        </div>
        <div className="auth-perks">
          <h2>Con CapyABA obtienes</h2>
          {PERKS.map((p, i) => (
            <div key={i} className="auth-perk">
              <CheckCircle2 className="auth-perk-icon" />
              <div>
                <div className="auth-perk-title">{p.title}</div>
                <div className="auth-perk-desc">{p.desc}</div>
              </div>
            </div>
          ))}
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
