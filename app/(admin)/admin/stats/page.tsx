
import { createClient } from '@/lib/supabase/server'
import {
  Users, BookOpen, Award, TrendingUp, BarChart3,
  CheckCircle2, Clock, Star, AlertCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const supabase = await createClient()

  // ── Conteos generales ──
  const [
    { count: totalStudents },
    { count: totalCourses },
    { count: totalCertificates },
    { count: totalEnrollments },
    { count: completedEnrollments },
    { count: totalAttempts },
    { count: passedAttempts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('passed', true),
  ])

  // ── Alumnos nuevos por mes (últimos 6 meses) ──
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const { data: newStudentsRaw } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('role', 'student')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  // ── Cursos con conteos por separado ──
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title, is_published')
    .order('created_at', { ascending: false })

  const { data: enrollCountsRaw } = await supabase
    .from('enrollments')
    .select('course_id')

  const { data: certCountsRaw } = await supabase
    .from('certificates')
    .select('enrollment_id, enrollments!inner(course_id)')

  // ── Últimos certificados ──
  const { data: recentCerts } = await supabase
    .from('certificates')
    .select(`
      id, issued_at, final_score, student_name, course_title,
      enrollments!inner(
        profiles:student_id(full_name),
        courses(title)
      )
    `)
    .order('issued_at', { ascending: false })
    .limit(5)

  // ── Intentos de quiz recientes ──
  const { data: recentAttempts } = await supabase
    .from('quiz_attempts')
    .select(`
      id, submitted_at, score, passed,
      enrollments!inner(profiles:student_id(full_name)),
      quizzes(title)
    `)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(8)

  // ── Calcular métricas ──
  const completionRate = (totalEnrollments || 0) > 0
    ? Math.round(((completedEnrollments || 0) / (totalEnrollments || 0)) * 100)
    : 0

  const passRate = (totalAttempts || 0) > 0
    ? Math.round(((passedAttempts || 0) / (totalAttempts || 0)) * 100)
    : 0

  // Agrupar alumnos nuevos por mes
  const monthlyStudents = buildMonthlyData(newStudentsRaw || [])

  // Construir mapa de conteos
  const enrollMap: Record<string, number> = {}
  ;(enrollCountsRaw || []).forEach((e: any) => {
    enrollMap[e.course_id] = (enrollMap[e.course_id] || 0) + 1
  })

  const certMap: Record<string, number> = {}
  ;(certCountsRaw || []).forEach((c: any) => {
    const courseId = c.enrollments?.course_id
    if (courseId) certMap[courseId] = (certMap[courseId] || 0) + 1
  })

  const courses = (coursesData || []) as any[]
  const topCourses = [...courses]
    .sort((a, b) => (enrollMap[b.id] || 0) - (enrollMap[a.id] || 0))
    .slice(0, 5)

  const maxEnrollments = Math.max(...topCourses.map((c: any) => enrollMap[c.id] || 0), 1)

  return (
    <div style={{ padding: '26px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="admin-breadcrumb">
          <span>Panel de instructor</span>
          <span className="sep">/</span>
          <span className="current">Estadísticas</span>
        </div>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Estadísticas</h1>
        <p style={{ fontSize: 13, color: 'var(--a-ink-2)' }}>
          Resumen de rendimiento de tus cursos y alumnos.
        </p>
      </div>

      {/* KPIs principales */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 24,
      }} className="stats-kpi-grid">
        <KpiCard icon={<Users size={16} strokeWidth={2} />} label="Alumnos totales" value={totalStudents || 0} color="var(--a-brand)" />
        <KpiCard icon={<BookOpen size={16} strokeWidth={2} />} label="Cursos creados" value={totalCourses || 0} color="#7c6ef7" />
        <KpiCard icon={<Award size={16} strokeWidth={2} />} label="Certificados emitidos" value={totalCertificates || 0} color="#16a34a" />
        <KpiCard icon={<TrendingUp size={16} strokeWidth={2} />} label="Tasa de aprobación" value={`${passRate}%`} color="#c08040" />
      </div>

      {/* Fila 2: métricas secundarias */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 28,
      }} className="stats-kpi-grid">
        <MetricCard
          label="Inscripciones totales"
          value={totalEnrollments || 0}
          sub={`${completedEnrollments || 0} completadas`}
          icon={<CheckCircle2 size={14} strokeWidth={2} />}
        />
        <MetricCard
          label="Tasa de finalización"
          value={`${completionRate}%`}
          sub={`${completedEnrollments || 0} de ${totalEnrollments || 0} inscritos`}
          icon={<BarChart3 size={14} strokeWidth={2} />}
          highlight={completionRate >= 50}
        />
        <MetricCard
          label="Intentos de evaluación"
          value={totalAttempts || 0}
          sub={`${passedAttempts || 0} aprobados (${passRate}%)`}
          icon={<Star size={14} strokeWidth={2} />}
        />
      </div>

      {/* Fila 3: gráficos y tablas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 18,
        marginBottom: 24,
      }} className="stats-content-grid">

        {/* Alumnos nuevos por mes */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 className="section-heading" style={{ marginBottom: 18 }}>
            Alumnos nuevos — últimos 6 meses
          </h2>
          {monthlyStudents.every(m => m.count === 0) ? (
            <EmptyState text="Aún no hay alumnos registrados." />
          ) : (
            <BarChart data={monthlyStudents} />
          )}
        </div>

        {/* Top cursos */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 className="section-heading" style={{ marginBottom: 18 }}>
            Cursos por inscripciones
          </h2>
          {topCourses.length === 0 ? (
            <EmptyState text="Aún no hay cursos creados." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topCourses.map((course: any) => {
                const enrollCount = enrollMap[course.id] || 0
                const certCount = certMap[course.id] || 0
                const pct = Math.round((enrollCount / maxEnrollments) * 100)
                return (
                  <div key={course.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>
                          {course.title}
                        </span>
                        {!course.is_published && (
                          <span style={{
                            marginLeft: 6, fontSize: 10, fontWeight: 700,
                            color: 'var(--a-ink-3)',
                            background: 'var(--a-surface-2)',
                            padding: '1px 6px', borderRadius: 4,
                          }}>BORRADOR</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>
                          {enrollCount} {enrollCount === 1 ? 'alumno' : 'alumnos'}
                        </span>
                        {certCount > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: '#16a34a',
                            background: 'var(--a-ok-50)',
                            padding: '1px 7px', borderRadius: 4,
                          }}>
                            {certCount} cert.
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      height: 6, borderRadius: 99,
                      background: 'var(--a-surface-2)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--a-brand)',
                        borderRadius: 99,
                        transition: 'width .4s ease',
                        minWidth: enrollCount > 0 ? 8 : 0,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fila 4: tablas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 18,
      }} className="stats-content-grid">

        {/* Últimos certificados */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--a-border)' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>Últimos certificados</h2>
          </div>
          {!recentCerts?.length ? (
            <div style={{ padding: 24 }}>
              <EmptyState text="Aún no se han emitido certificados." />
            </div>
          ) : (
            <div>
              {recentCerts.map((c: any) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--a-border)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--a-ok-50)', color: '#16a34a',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Award size={15} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(c as any).student_name || (c as any).enrollments?.profiles?.full_name || 'Sin nombre'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--a-ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(c as any).course_title || (c as any).enrollments?.courses?.title || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: '#16a34a',
                      background: 'var(--a-ok-50)', padding: '2px 8px', borderRadius: 6,
                      marginBottom: 3,
                    }}>
                      {c.final_score}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--a-ink-3)' }}>
                      {formatDate(c.issued_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas evaluaciones */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--a-border)' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>Últimas evaluaciones</h2>
          </div>
          {!recentAttempts?.length ? (
            <div style={{ padding: 24 }}>
              <EmptyState text="Aún no hay evaluaciones enviadas." />
            </div>
          ) : (
            <div>
              {recentAttempts.map((a: any) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--a-border)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: a.passed ? 'var(--a-ok-50)' : 'var(--a-warn-50)',
                    color: a.passed ? '#16a34a' : 'var(--a-warn)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    {a.passed
                      ? <CheckCircle2 size={15} strokeWidth={2} />
                      : <AlertCircle size={15} strokeWidth={2} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(a as any).enrollments?.profiles?.full_name || 'Sin nombre'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--a-ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(a as any).quizzes?.title || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: a.passed ? '#16a34a' : 'var(--a-warn)',
                      background: a.passed ? 'var(--a-ok-50)' : 'var(--a-warn-50)',
                      padding: '2px 8px', borderRadius: 6, marginBottom: 3,
                    }}>
                      {a.score ?? '—'}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--a-ink-3)' }}>
                      {a.submitted_at ? formatDate(a.submitted_at) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @media (max-width: 1024px) {
          .stats-content-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .stats-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Helpers ── */

function buildMonthlyData(rows: { created_at: string }[]) {
  const months: { label: string; count: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
      count: 0,
    })
  }
  rows.forEach(r => {
    const d = new Date(r.created_at)
    const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    const idx = 5 - diffMonths
    if (idx >= 0 && idx < 6) months[idx].count++
  })
  return months
}

/* ── Componentes ── */

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number | string; color: string
}) {
  return (
    <div className="kpi" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 34, height: 34, borderRadius: '50%',
        background: color + '18',
        color,
        display: 'grid', placeItems: 'center',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink-3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, icon, highlight }: {
  label: string; value: number | string; sub: string; icon: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className="kpi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ color: highlight ? '#16a34a' : 'var(--a-ink-3)' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink-3)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--a-ink)', letterSpacing: '-0.03em', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>{sub}</div>
    </div>
  )
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--a-ink-2)' }}>
            {d.count > 0 ? d.count : ''}
          </span>
          <div style={{
            width: '100%',
            height: `${Math.max((d.count / max) * 80, d.count > 0 ? 6 : 2)}px`,
            background: d.count > 0 ? 'var(--a-brand)' : 'var(--a-surface-2)',
            borderRadius: '4px 4px 0 0',
            transition: 'height .3s ease',
            minHeight: 2,
          }} />
          <span style={{ fontSize: 9, color: 'var(--a-ink-3)', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <Clock size={24} strokeWidth={1.5} style={{ color: 'var(--a-ink-3)', margin: '0 auto 8px' }} />
      <p style={{ fontSize: 13, color: 'var(--a-ink-3)', margin: 0 }}>{text}</p>
    </div>
  )
}
