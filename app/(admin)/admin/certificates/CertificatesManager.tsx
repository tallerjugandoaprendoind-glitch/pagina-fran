'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Award, Download, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Cert = {
  id: string
  enrollment_id: string
  certificate_number: string | null
  issued_at: string
  final_score: number
  pdf_url: string | null
  profiles: { id: string; full_name: string; email: string } | null
  courses: { id: string; title: string } | null
}

type PendingEnrollment = {
  id: string
  final_score: number
  completed_at: string
  profiles: { id: string; full_name: string; email: string } | null
  courses: { id: string; title: string } | null
}

export default function CertificatesManager({
  initialCerts,
  pendingEnrollments,
}: {
  initialCerts: Cert[]
  pendingEnrollments: PendingEnrollment[]
}) {
  const { showToast } = useToast()
  const [certs, setCerts] = useState<Cert[]>(initialCerts)
  const [pending, setPending] = useState<PendingEnrollment[]>(pendingEnrollments)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Re-emitir un certificado que ya existe (borra el registro y regenera)
  async function reEmit(cert: Cert) {
    setLoadingId(cert.id)
    const supabase = createClient()

    // Borrar el registro existente para que la API pueda crear uno nuevo
    const { error: delErr } = await supabase
      .from('certificates')
      .delete()
      .eq('id', cert.id)

    if (delErr) {
      showToast('Error al borrar el certificado: ' + delErr.message, 'error')
      setLoadingId(null)
      return
    }

    const res = await fetch('/api/certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId: cert.enrollment_id }),
    })

    const data = await res.json()

    if (!res.ok) {
      showToast('Error al re-emitir: ' + (data.error || res.statusText), 'error')
      // Recargar para reflejar el estado real
      window.location.reload()
      return
    }

    // Actualizar la fila en el estado local
    setCerts(prev =>
      prev.map(c =>
        c.id === cert.id
          ? { ...c, pdf_url: data.url }
          : c
      ).filter(c => {
        // Si cambió el id (nuevo registro), refrescar
        return true
      })
    )
    showToast('Certificado re-emitido correctamente ✓', 'success')
    if (data.url) window.open(data.url, '_blank')
    setTimeout(() => window.location.reload(), 800)
    setLoadingId(null)
  }

  // Generar certificado para un enrollment completado sin certificado
  async function generateForPending(enrollment: PendingEnrollment) {
    setLoadingId(enrollment.id)

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: enrollment.id }),
      })

      let data: any = {}
      try { data = await res.json() } catch {}

      if (!res.ok) {
        const msg = data?.error || res.statusText || 'Error ' + res.status
        showToast('Error al generar: ' + msg, 'error')
        return
      }

      showToast('Certificado generado correctamente ✓', 'success')
      // Abrir el PDF en nueva pestaña inmediatamente
      if (data.url) window.open(data.url, '_blank')
      setPending(prev => prev.filter(e => e.id !== enrollment.id))
      setTimeout(() => window.location.reload(), 800)
    } catch (err: any) {
      showToast('Error de red: ' + (err?.message || 'sin conexión'), 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const iconBtnStyle = {
    display: 'inline-grid', placeItems: 'center',
    width: 30, height: 30, borderRadius: 6,
    border: '1px solid var(--a-border)',
    background: 'var(--a-surface)',
    color: 'var(--a-ink-2)',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    textDecoration: 'none',
  } as const

  const reEmitBtnStyle = (loading: boolean) => ({
    ...iconBtnStyle,
    color: loading ? 'var(--a-ink-3)' : 'var(--a-brand)',
    borderColor: loading ? 'var(--a-border)' : 'var(--a-brand)',
    opacity: loading ? 0.6 : 1,
    cursor: loading ? 'not-allowed' : 'pointer',
  } as const)

  return (
    <div>
      {/* ─── Pendientes sin certificado ─────────────────── */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <AlertCircle size={15} strokeWidth={2.2} color="var(--a-warn, #C2410C)" />
            <h2 className="section-heading" style={{ margin: 0 }}>
              Completados sin certificado
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--a-warn, #C2410C)',
              background: 'var(--a-warn-50, #FEF4EE)',
              padding: '2px 8px', borderRadius: 100,
            }}>
              {pending.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(e => (
              <div key={e.id} style={{
                background: 'var(--a-warn-50, #FFFBF8)',
                border: '1px solid var(--a-warn, #C2410C)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--a-warn, #C2410C)', color: '#fff',
                      display: 'grid', placeItems: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {(e.profiles?.full_name || e.profiles?.email || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.profiles?.full_name || 'Sin nombre'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--a-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.profiles?.email}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 13, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 100,
                    background: 'var(--a-ok-50)', color: 'var(--a-ok)',
                  }}>
                    {e.final_score}%
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--a-ink-2)', marginBottom: 12, paddingLeft: 46 }}>
                  📚 {e.courses?.title || '—'} · {formatDate(e.completed_at)}
                </div>
                <div style={{ paddingLeft: 46 }}>
                  <button
                    onClick={() => generateForPending(e)}
                    disabled={loadingId === e.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 100, border: 'none',
                      background: loadingId === e.id ? 'var(--a-surface-2)' : 'var(--a-brand)',
                      color: loadingId === e.id ? 'var(--a-ink-3)' : '#fff',
                      fontSize: 13, fontWeight: 700, cursor: loadingId === e.id ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', transition: 'background 0.15s',
                    }}
                  >
                    <Award size={14} strokeWidth={2.2}
                      style={{ animation: loadingId === e.id ? 'spin 1s linear infinite' : 'none' }}
                    />
                    {loadingId === e.id ? 'Generando…' : 'Generar certificado'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Lista de certificados emitidos ─────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <h2 className="section-heading">Historial de emisiones</h2>
        {certs.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--a-ink-3)', fontWeight: 600 }}>
            {certs.length} {certs.length === 1 ? 'certificado' : 'certificados'}
          </span>
        )}
      </div>

      {certs.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: 'var(--a-surface-2)', color: 'var(--a-brand)',
            margin: '0 auto 14px', display: 'grid', placeItems: 'center',
          }}>
            <Award size={24} strokeWidth={2} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--a-ink)', marginBottom: 6 }}>
            Aún no se han emitido certificados
          </h3>
          <p style={{ fontSize: 13, color: 'var(--a-ink-2)', maxWidth: 380, margin: '0 auto' }}>
            Cuando un alumno complete un curso con éxito, su certificado aparecerá aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 2fr) 100px 140px 110px',
            gap: 12, padding: '10px 16px',
            background: 'var(--a-surface)',
            borderBottom: '1px solid var(--a-border)',
            fontSize: 10, fontWeight: 700,
            color: 'var(--a-ink-3)', letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }} className="cert-header">
            <div>Alumno</div>
            <div>Curso</div>
            <div style={{ textAlign: 'center' }}>Nota</div>
            <div>Emitido</div>
            <div style={{ textAlign: 'right' }}>Acciones</div>
          </div>

          {certs.map((cert) => (
            <div key={cert.id} style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 2fr) 100px 140px 110px',
              gap: 12, padding: '14px 16px',
              borderBottom: '1px solid var(--a-border)',
              alignItems: 'center',
            }} className="cert-row">
              <div className="cert-col-student" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--a-side-bg)', color: 'var(--cream)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {(cert.profiles?.full_name || cert.profiles?.email || 'A')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cert.profiles?.full_name || 'Sin nombre'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--a-ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cert.certificate_number ? `#${cert.certificate_number}` : cert.profiles?.email}
                  </div>
                </div>
              </div>

              <div className="cert-col-course" style={{ fontSize: 13, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cert.courses?.title || '—'}
              </div>

              <div className="cert-col-meta" style={{ textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block', fontSize: 12, fontWeight: 700,
                  padding: '3px 9px', borderRadius: 100,
                  background: 'var(--a-ok-50)', color: 'var(--a-ok)',
                }}>
                  {cert.final_score}%
                </span>
              </div>

              <div className="cert-col-date" style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>
                {formatDate(cert.issued_at)}
              </div>

              <div className="cert-col-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                {cert.pdf_url ? (
                  <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer"
                    style={iconBtnStyle} title="Descargar PDF">
                    <Download size={14} strokeWidth={2.2} />
                  </a>
                ) : (
                  <span style={{ ...iconBtnStyle, opacity: 0.3, cursor: 'default' }} title="PDF no disponible">
                    <Download size={14} strokeWidth={2.2} />
                  </span>
                )}

                <button
                  onClick={() => reEmit(cert)}
                  disabled={loadingId === cert.id}
                  style={reEmitBtnStyle(loadingId === cert.id)}
                  title="Re-emitir certificado"
                >
                  <RefreshCw
                    size={14} strokeWidth={2.2}
                    style={{ animation: loadingId === cert.id ? 'spin 1s linear infinite' : 'none' }}
                  />
                </button>

                <Link href={`/admin/students?id=${cert.profiles?.id || ''}`}
                  style={iconBtnStyle} title="Ver alumno">
                  <ExternalLink size={14} strokeWidth={2.2} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .cert-header { display: none !important; }
          .cert-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            padding: 14px !important;
            position: relative !important;
          }
          .cert-col-student { order: 1; }
          .cert-col-course  { order: 2; padding-left: 46px; font-size: 13px !important; }
          .cert-col-meta    { order: 1; position: absolute; top: 14px; right: 14px; text-align: right !important; }
          .cert-col-actions { order: 3; justify-content: flex-start !important; padding-left: 46px; margin-top: 4px; }
          .cert-col-date    { display: none !important; }
        }
      `}</style>
    </div>
  )
}
