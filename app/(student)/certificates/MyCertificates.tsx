'use client'

import { useState } from 'react'
import { CapyMascot } from '@/components/ui/CapyLogo'
import { Award, Download, Calendar, RefreshCw, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Cert = {
  id: string
  student_name: string
  course_title: string
  final_score: number
  issued_at: string
  pdf_url: string | null
  verification_code: string
}

type ReadyEnrollment = {
  id: string
  final_score: number
  completed_at: string
  courses: { id: string; title: string } | null
}

type ActiveEnrollment = {
  id: string
  courses: { id: string; title: string } | null
}

export default function MyCertificates({
  initialCerts,
  readyEnrollments,
  activeEnrollments,
}: {
  initialCerts: Cert[]
  readyEnrollments: ReadyEnrollment[]
  activeEnrollments: ActiveEnrollment[]
}) {
  const [certs, setCerts] = useState<Cert[]>(initialCerts)
  const [pending, setPending] = useState<ReadyEnrollment[]>(readyEnrollments)
  const [active, setActive] = useState<ActiveEnrollment[]>(activeEnrollments)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generateCert(enrollment: ReadyEnrollment) {
    setLoadingId(enrollment.id)
    setError(null)

    const res = await fetch('/api/certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId: enrollment.id }),
    })

    let data: any = {}
    try {
      data = await res.json()
    } catch {
      setError('Error del servidor. Por favor intenta de nuevo.')
      setLoadingId(null)
      return
    }

    if (!res.ok) {
      setError(data.error || 'No se pudo generar el certificado. Intenta de nuevo.')
      setLoadingId(null)
      return
    }

    // Agregar el certificado a la lista y quitar de pendientes
    const newCert: Cert = {
      id: data.verificationCode, // temporal
      student_name: '',
      course_title: enrollment.courses?.title || '',
      final_score: enrollment.final_score,
      issued_at: new Date().toISOString(),
      pdf_url: data.url,
      verification_code: data.verificationCode,
    }

    setCerts(prev => [newCert, ...prev])
    setPending(prev => prev.filter(e => e.id !== enrollment.id))
    setLoadingId(null)
  }

  async function checkCompletion(enrollment: ActiveEnrollment) {
    setLoadingId(enrollment.id)
    setError(null)
    const res = await fetch('/api/enrollments/check-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId: enrollment.id }),
    })
    let data: any = {}
    try { data = await res.json() } catch (e) {}
    setLoadingId(null)

    if (data.completed) {
      // Quitar de activos y mover a pendientes o certs según si hay URL
      setActive(prev => prev.filter(e => e.id !== enrollment.id))
      if (data.certificateUrl) {
        setCerts(prev => [{
          id: data.verificationCode || enrollment.id,
          student_name: '',
          course_title: enrollment.courses?.title || '',
          final_score: 0,
          issued_at: new Date().toISOString(),
          pdf_url: data.certificateUrl,
          verification_code: data.verificationCode || '',
        }, ...prev])
      } else {
        setPending(prev => [{
          id: enrollment.id,
          final_score: 0,
          completed_at: new Date().toISOString(),
          courses: enrollment.courses,
        }, ...prev])
      }
    } else {
      setError(`"${enrollment.courses?.title}" aún no cumple los requisitos para certificarse.`)
    }
  }

  const hasSomething = certs.length > 0 || pending.length > 0 || active.length > 0

  return (
    <div>
      {/* ── Cursos listos para emitir certificado ──────── */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#1F1710', marginBottom: 4,
          }}>
            🎓 Listo para certificar
          </h2>
          <p style={{ fontSize: 13, color: '#6B5E4E', marginBottom: 16 }}>
            Completaste estos cursos. Genera tu certificado ahora.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {pending.map(e => (
              <div key={e.id} style={{
                borderRadius: 14,
                border: '2px dashed #C4A882',
                background: 'linear-gradient(135deg, #FDF8F2 0%, #F5EDE0 100%)',
                padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#EDE3D6',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Award size={22} strokeWidth={2} color="#8B6F47" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: '#1F1710', lineHeight: 1.3,
                      marginBottom: 4,
                    }}>
                      {e.courses?.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8A7860' }}>
                      <span>Nota: <strong style={{ color: '#0F6E56' }}>{e.final_score}%</strong></span>
                      <span>·</span>
                      <span>{formatDate(e.completed_at)}</span>
                    </div>
                  </div>
                </div>

                {error && loadingId === e.id && (
                  <p style={{ fontSize: 12, color: '#C2410C', margin: 0 }}>{error}</p>
                )}

                <button
                  onClick={() => generateCert(e)}
                  disabled={loadingId === e.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 16px', borderRadius: 100,
                    border: 'none',
                    background: loadingId === e.id ? '#D4C5B0' : '#1F1710',
                    color: loadingId === e.id ? '#8A7860' : '#F4ECDF',
                    fontSize: 13, fontWeight: 700,
                    cursor: loadingId === e.id ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, transform 0.1s',
                    width: '100%',
                  }}
                >
                  {loadingId === e.id
                    ? <><Loader2 size={14} strokeWidth={2.2} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
                    : <><Award size={14} strokeWidth={2.2} /> Obtener certificado</>
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Certificados obtenidos ──────────────────────── */}
      {certs.length > 0 && (
        <div>
          {pending.length > 0 && (
            <h2 style={{
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
              color: '#1F1710', marginBottom: 16,
            }}>
              Mis certificados
            </h2>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {certs.map((cert) => (
              <div key={cert.id} style={{
                borderRadius: 14,
                border: '1px solid #E8DDD0',
                background: '#FEFCF9',
                padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#1F1710',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Award size={22} strokeWidth={2} color="#F4ECDF" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: '#1F1710', lineHeight: 1.3,
                      marginBottom: 4,
                    }}>
                      {cert.course_title}
                    </div>
                    {cert.student_name && (
                      <div style={{ fontSize: 12, color: '#8A7860', marginBottom: 2 }}>
                        Otorgado a {cert.student_name}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8A7860' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} strokeWidth={2} />
                        {formatDate(cert.issued_at)}
                      </span>
                      <span>·</span>
                      <span>Nota: <strong style={{ color: '#0F6E56' }}>{cert.final_score}%</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: 11, color: '#A89880',
                  fontFamily: 'monospace', letterSpacing: '0.04em',
                }}>
                  {cert.verification_code}
                </div>

                {cert.pdf_url ? (
                  <a
                    href={cert.pdf_url}
                    target="_blank"
                    rel="noopener"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '10px 16px', borderRadius: 100,
                      border: '1.5px solid #1F1710',
                      background: 'transparent',
                      color: '#1F1710',
                      fontSize: 13, fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Download size={14} strokeWidth={2.2} />
                    Descargar PDF
                  </a>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 16px', borderRadius: 100,
                    border: '1.5px solid #D4C5B0',
                    color: '#A89880', fontSize: 13, fontWeight: 700,
                  }}>
                    <RefreshCw size={14} strokeWidth={2.2} />
                    PDF en proceso…
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cursos en progreso (verificar si completaron) ── */}
      {active.length > 0 && (
        <div style={{ marginTop: pending.length > 0 || certs.length > 0 ? 32 : 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F1710', marginBottom: 4 }}>
            Cursos en progreso
          </h2>
          <p style={{ fontSize: 13, color: '#6B5E4E', marginBottom: 14 }}>
            Si crees haber completado un curso, verifica si ya cumples los requisitos.
          </p>
          {error && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#B91C1C', marginBottom: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                background: '#FAF7F2',
                border: '1px solid #E8DDD0',
                borderRadius: 12,
              }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1F1710' }}>
                  {e.courses?.title}
                </div>
                <button
                  onClick={() => checkCompletion(e)}
                  disabled={loadingId === e.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 100,
                    border: '1.5px solid #1F1710',
                    background: 'transparent', color: '#1F1710',
                    fontSize: 12, fontWeight: 700,
                    cursor: loadingId === e.id ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: loadingId === e.id ? 0.6 : 1,
                  }}
                >
                  {loadingId === e.id
                    ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Verificando…</>
                    : '✓ Verificar completitud'
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Estado vacío ────────────────────────────────── */}
      {!hasSomething && (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          background: '#F7F2EB', borderRadius: 16,
          border: '1px solid #E8DDD0',
        }}>
          <CapyMascot size={140} className="mx-auto mb-4" />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F1710', marginBottom: 8 }}>
            Aún no tienes certificados
          </h3>
          <p style={{ fontSize: 13, color: '#6B5E4E', maxWidth: 320, margin: '0 auto' }}>
            Completa tus cursos con 80%+ para obtener tu primer certificado
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
