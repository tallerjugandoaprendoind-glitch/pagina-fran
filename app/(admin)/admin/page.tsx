
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CapyMascot } from '@/components/ui/CapyLogo'
import {
  Plus, BookOpen, Users, Award, AlertCircle, TrendingUp,
  BarChart3, Edit2, Download, Check, ClipboardCheck, UserPlus,
  ArrowRight, GraduationCap, Activity,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CourseThumb } from '@/components/admin/CourseCoverUpload'
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: coursesCount },
    { count: studentsCount },
    { count: pendingReviews },
    { count: certificatesCount },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('needs_review', true),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
  ])

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single()
  const firstName = profile?.full_name?.split(' ')[0] || 'Instructor'

  const { data: courses } = await supabase
    .from('courses')
    .select(`id, title, description, cover_url, is_published, created_at, enrollments(count), modules(count)`)
    .order('created_at', { ascending: false })
    .limit(10)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { count: newStudentsThisWeek } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .gte('created_at', weekAgo.toISOString())

  const { data: recentEnrollments } = await supabase
    .from('enrollments')
    .select('id, started_at, status, profiles:student_id(full_name), courses(title)')
    .order('started_at', { ascending: false })
    .limit(5)

  const { data: recentAttempts } = await supabase
    .from('quiz_attempts')
    .select('id, submitted_at, needs_review, passed, profiles:student_id(full_name), quizzes(title)')
    .order('submitted_at', { ascending: false })
    .limit(5)

  const activity: Array<{
    id: string; type: 'enroll' | 'submit' | 'complete'; name: string; detail: string; at: string
  }> = []
  recentEnrollments?.forEach((e: any) => {
    activity.push({
      id: 'e' + e.id,
      type: e.status === 'completed' ? 'complete' : 'enroll',
      name: e.profiles?.full_name || 'Alumno',
      detail: e.courses?.title || 'Curso',
      at: e.started_at,
    })
  })
  recentAttempts?.forEach((a: any) => {
    if (!a.submitted_at) return
    activity.push({
      id: 'a' + a.id,
      type: 'submit',
      name: a.profiles?.full_name || 'Alumno',
      detail: a.quizzes?.title || 'Evaluación',
      at: a.submitted_at,
    })
  })
  activity.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  const topActivity = activity.slice(0, 8)

  const pending = pendingReviews || 0
  const newThisWeek = newStudentsThisWeek || 0

  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <div className="admin-breadcrumb">
            <span>Panel de instructor</span>
            <span className="sep">/</span>
            <span className="current">Resumen</span>
          </div>
          <h1 className="page-title" style={{ marginBottom: 5 }}>
            {getGreeting()}, {firstName}
          </h1>
          <div className="db-subtitle">
            {pending > 0 ? (
              <>
                Tienes{' '}
                <Link href="/admin/reviews" className="db-link-warn">
                  {pending} {pending === 1 ? 'evaluación pendiente' : 'evaluaciones pendientes'}
                </Link>
                {newThisWeek > 0 ? (
                  <> y {newThisWeek} {newThisWeek === 1 ? 'nuevo alumno' : 'nuevos alumnos'} esta semana.</>
                ) : '.'}
              </>
            ) : newThisWeek > 0 ? (
              <>Tienes {newThisWeek} {newThisWeek === 1 ? 'nuevo alumno' : 'nuevos alumnos'} esta semana.</>
            ) : (
              '¡Todo al día! No hay tareas pendientes por ahora.'
            )}
          </div>
        </div>
        <div className="db-header-actions">
          <Link href="/admin/students" className="btn-secondary">
            <Download size={14} strokeWidth={2.2} />
            Exportar
          </Link>
          <Link href="/admin/courses/new" className="btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            Nuevo curso
          </Link>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="db-kpi-grid">
        <KpiCard
          label="Cursos"
          value={coursesCount || 0}
          icon={<BookOpen size={16} strokeWidth={2} />}
          href="/admin/courses"
          foot={(coursesCount || 0) > 0 ? 'Administra tu catálogo' : 'Crear el primero →'}
        />
        <KpiCard
          label="Alumnos activos"
          value={studentsCount || 0}
          icon={<Users size={16} strokeWidth={2} />}
          href="/admin/students"
          trend={newThisWeek > 0 ? `+${newThisWeek} esta semana` : undefined}
          foot={newThisWeek > 0 ? undefined : 'Ver lista →'}
        />
        <KpiCard
          label="Por revisar"
          value={pending}
          icon={<AlertCircle size={16} strokeWidth={2} />}
          href="/admin/reviews"
          warning={pending > 0}
          foot={pending > 0 ? 'Revisar ahora →' : '✓ Todo al día'}
        />
        <KpiCard
          label="Certificados"
          value={certificatesCount || 0}
          icon={<Award size={16} strokeWidth={2} />}
          href="/admin/certificates"
          foot={(certificatesCount || 0) > 0 ? 'Ver emitidos →' : 'Aún no emitidos'}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="db-main-grid">

        {/* LEFT: courses */}
        <section className="db-section">
          <div className="db-section-header">
            <div className="db-section-title">
              <BookOpen size={14} strokeWidth={2} />
              Mis cursos
            </div>
            <Link href="/admin/courses/new" className="db-section-action">
              <Plus size={12} strokeWidth={2.5} />
              Agregar curso
            </Link>
          </div>

          {!courses?.length ? (
            <div className="card db-empty">
              <CapyMascot size={90} className="mx-auto" />
              <h3 className="db-empty-title">Aún no has creado cursos</h3>
              <p className="db-empty-desc">
                Empieza por crear tu primer curso con videos, lecciones y evaluaciones
              </p>
              <Link href="/admin/courses/new" className="btn-primary">
                <Plus size={14} strokeWidth={2.5} />
                Crear mi primer curso
              </Link>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {courses.map((course: any, idx: number) => {
                const modules = course.modules?.[0]?.count || 0
                const enrollments = course.enrollments?.[0]?.count || 0
                return (
                  <div key={course.id} className="db-course-row">
                    <CourseThumb coverUrl={course.cover_url} title={course.title} index={idx} size={46} />
                    <div className="db-course-info">
                      <div className="db-course-top">
                        <span className="db-course-title">{course.title}</span>
                        <span className={`badge ${course.is_published ? 'badge-mocha' : 'badge-neutral'}`}>
                          {course.is_published ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>
                      <div className="db-course-meta">
                        <span>{modules} {modules === 1 ? 'módulo' : 'módulos'}</span>
                        <span className="db-dot">·</span>
                        <span>{enrollments} {enrollments === 1 ? 'alumno' : 'alumnos'}</span>
                        <span className="db-dot">·</span>
                        <span>Creado {formatDate(course.created_at)}</span>
                      </div>
                    </div>
                    <div className="db-course-actions">
                      <Link href={`/admin/courses/${course.id}?tab=students`} className="db-action-btn">
                        <BarChart3 size={13} strokeWidth={2.2} />
                        Progreso
                      </Link>
                      <Link href={`/admin/courses/${course.id}`} className="db-action-btn">
                        <Edit2 size={13} strokeWidth={2.2} />
                        Editar
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* RIGHT: activity + quick stats */}
        <div className="db-right-col">

          {/* Quick stats mini-cards */}
          <div className="db-mini-grid">
            <div className="db-mini-card">
              <GraduationCap size={16} strokeWidth={1.8} style={{ color: 'var(--a-brand)' }} />
              <div className="db-mini-value">{(studentsCount || 0) > 0 ? Math.round(((certificatesCount || 0) / (studentsCount || 1)) * 100) : 0}%</div>
              <div className="db-mini-label">Tasa de certificación</div>
            </div>
            <div className="db-mini-card">
              <Activity size={16} strokeWidth={1.8} style={{ color: 'var(--a-ok)' }} />
              <div className="db-mini-value">{topActivity.length}</div>
              <div className="db-mini-label">Eventos recientes</div>
            </div>
          </div>

          {/* Activity feed */}
          <section className="db-section">
            <div className="db-section-header">
              <div className="db-section-title">
                <Activity size={14} strokeWidth={2} />
                Actividad reciente
              </div>
            </div>

            {topActivity.length === 0 ? (
              <div className="card db-empty" style={{ padding: '28px 20px' }}>
                <div className="db-empty-icon">
                  <UserPlus size={18} strokeWidth={2} />
                </div>
                <p className="db-empty-desc" style={{ marginBottom: 0 }}>
                  Cuando tengas alumnos activos, verás aquí su progreso en tiempo real.
                </p>
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {topActivity.map((a) => (
                  <ActivityItem key={a.id} item={a} />
                ))}
                <Link href="/admin/students" className="db-activity-footer">
                  Ver toda la actividad
                  <ArrowRight size={12} strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function ActivityItem({ item }: { item: { type: string; name: string; detail: string; at: string } }) {
  const config = {
    enroll: {
      icon: <UserPlus size={13} strokeWidth={2.3} />,
      bg: 'var(--a-surface-2)',
      color: 'var(--a-brand)',
      verb: 'se inscribió a',
    },
    submit: {
      icon: <ClipboardCheck size={13} strokeWidth={2.3} />,
      bg: 'var(--a-warn-50)',
      color: 'var(--a-warn)',
      verb: 'envió evaluación de',
    },
    complete: {
      icon: <Check size={13} strokeWidth={2.5} />,
      bg: 'var(--a-ok-50)',
      color: 'var(--a-ok)',
      verb: 'completó',
    },
  }[item.type] || {
    icon: <UserPlus size={13} strokeWidth={2.3} />,
    bg: 'var(--a-surface-2)',
    color: 'var(--a-brand)',
    verb: '',
  }

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 14px',
      borderBottom: '1px solid var(--a-border)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: config.bg, color: config.color,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {config.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--a-ink)' }}>
          <strong style={{ fontWeight: 700 }}>{item.name}</strong>{' '}
          {config.verb}{' '}
          <span style={{ color: 'var(--a-ink-2)' }}>{item.detail}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--a-ink-3)', marginTop: 2 }}>
          {relativeTime(item.at)}
        </div>
      </div>
    </div>
  )
}

function relativeTime(iso: string) {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace unos segundos'
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  return formatDate(iso)
}

function KpiCard({
  label, value, icon, warning, foot, href, trend,
}: {
  label: string
  value: number
  icon: React.ReactNode
  warning?: boolean
  foot?: string
  href?: string
  trend?: string
}) {
  return (
    <Link href={href || '#'} className={`kpi${warning ? ' kpi-warning' : ''}`} style={{ textDecoration: 'none' }}>
      <div className="kpi-header">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon">{icon}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {trend && (
        <div className="kpi-foot up">
          <TrendingUp size={11} strokeWidth={2.5} />
          {trend}
        </div>
      )}
      {!trend && foot && <div className="kpi-foot">{foot}</div>}
    </Link>
  )
}
