import { createClient } from '@/lib/supabase/server'
import { Award } from 'lucide-react'
import CertificatesManager from './CertificatesManager'

export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
  const supabase = await createClient()

  const { data: certificates } = await supabase
    .from('certificates')
    .select(`
      id, enrollment_id, certificate_number, issued_at, final_score, pdf_url,
      profiles:student_id (id, full_name, email),
      courses (id, title)
    `)
    .order('issued_at', { ascending: false })

  const list = (certificates as any[]) || []

  // Enrollments completados sin certificado
  const certEnrollmentIds = list.map((c: any) => c.enrollment_id).filter(Boolean)
  const pendingQuery = supabase
    .from('enrollments')
    .select(`
      id, final_score, completed_at,
      profiles:student_id (id, full_name, email),
      courses (id, title)
    `)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const { data: pendingRaw } = certEnrollmentIds.length > 0
    ? await pendingQuery.not('id', 'in', `(${certEnrollmentIds.join(',')})`)
    : await pendingQuery

  const pending = (pendingRaw as any[]) || []

  // Estadísticas
  const thisMonth = list.filter((c: any) => {
    const d = new Date(c.issued_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const byCourse = new Map<string, number>()
  list.forEach((c: any) => {
    const t = c.courses?.title || 'Sin curso'
    byCourse.set(t, (byCourse.get(t) || 0) + 1)
  })
  const topCourses = Array.from(byCourse.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div style={{ padding: '26px 32px 40px', maxWidth: 1400, margin: '0 auto' }}>

      <div style={{ marginBottom: 22 }}>
        <div className="admin-breadcrumb">
          <span>Panel de instructor</span>
          <span className="sep">/</span>
          <span className="current">Certificados</span>
        </div>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Certificados</h1>
        <p style={{ fontSize: 13, color: 'var(--a-ink-2)' }}>
          Todos los certificados emitidos automáticamente cuando los alumnos completan un curso.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
      }} className="cert-kpis">
        <div className="kpi">
          <div className="kpi-header">
            <div className="kpi-label">Total emitidos</div>
            <div className="kpi-icon"><Award size={14} strokeWidth={2.2} /></div>
          </div>
          <div className="kpi-value">{list.length}</div>
          <div className="kpi-foot">Desde el inicio</div>
        </div>

        <div className="kpi">
          <div className="kpi-header">
            <div className="kpi-label">Este mes</div>
            <div className="kpi-icon"><Award size={14} strokeWidth={2.2} /></div>
          </div>
          <div className="kpi-value">{thisMonth}</div>
          <div className="kpi-foot">Nuevos certificados</div>
        </div>

        <div className="kpi" style={{ borderColor: pending.length > 0 ? 'var(--a-warn)' : undefined }}>
          <div className="kpi-header">
            <div className="kpi-label">Por generar</div>
            <div className="kpi-icon" style={{ color: pending.length > 0 ? 'var(--a-warn)' : undefined }}>
              <Award size={14} strokeWidth={2.2} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: pending.length > 0 ? 'var(--a-warn)' : undefined }}>
            {pending.length}
          </div>
          <div className="kpi-foot">Completados sin certificado</div>
        </div>

        <div className="kpi">
          <div className="kpi-label" style={{ marginBottom: 10 }}>Curso top</div>
          {topCourses.length > 0 ? (
            <>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--a-ink)',
                letterSpacing: '-0.015em', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {topCourses[0][0]}
              </div>
              <div className="kpi-foot">
                {topCourses[0][1]} {topCourses[0][1] === 1 ? 'certificado' : 'certificados'} emitidos
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--a-ink-3)' }}>Sin datos aún</div>
          )}
        </div>
      </div>

      <CertificatesManager
        initialCerts={list}
        pendingEnrollments={pending}
      />

      <style>{`
        @media (max-width: 900px) {
          .cert-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .cert-kpis { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
