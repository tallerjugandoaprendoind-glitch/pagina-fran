
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, CheckCircle2, Clock, Award, TrendingUp, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export default async function CourseProgressPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, passing_score,
      modules ( id, lessons ( id, is_required ) )
    `)
    .eq('id', params.id)
    .single()

  if (!course) notFound()

  // Total de lecciones requeridas
  const totalRequiredLessons = (course.modules as any[]).reduce(
    (acc, m) => acc + m.lessons.filter((l: any) => l.is_required).length, 0
  )

  // Obtener matriculaciones con info del alumno
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id, status, final_score, started_at, completed_at,
      profiles:student_id ( id, full_name, email )
    `)
    .eq('course_id', params.id)

  // Progreso por alumno
  const enrollmentIds = (enrollments || []).map(e => e.id)

  const { data: allProgress } = await supabase
    .from('lesson_progress')
    .select('enrollment_id, lesson_id, completed_at')
    .in('enrollment_id', enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000'])

  const { data: allAttempts } = await supabase
    .from('quiz_attempts')
    .select('enrollment_id, score, passed, submitted_at')
    .in('enrollment_id', enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000'])

  // Agregar datos
  const progressByEnrollment = new Map<string, number>()
  for (const p of allProgress || []) {
    if (p.completed_at) {
      progressByEnrollment.set(p.enrollment_id, (progressByEnrollment.get(p.enrollment_id) || 0) + 1)
    }
  }

  const lastActivityByEnrollment = new Map<string, string>()
  for (const p of allProgress || []) {
    if (p.completed_at) {
      const existing = lastActivityByEnrollment.get(p.enrollment_id)
      if (!existing || p.completed_at > existing) {
        lastActivityByEnrollment.set(p.enrollment_id, p.completed_at)
      }
    }
  }

  const rows = (enrollments || []).map((e: any) => {
    const completedLessons = progressByEnrollment.get(e.id) || 0
    const progress = totalRequiredLessons > 0 ? Math.round((completedLessons / totalRequiredLessons) * 100) : 0
    const attempts = (allAttempts || []).filter(a => a.enrollment_id === e.id)
    const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)) : null
    const lastActivity = lastActivityByEnrollment.get(e.id)

    return {
      enrollmentId: e.id,
      student: e.profiles,
      status: e.status,
      progress,
      completedLessons,
      totalLessons: totalRequiredLessons,
      finalScore: e.final_score,
      bestScore,
      attempts: attempts.length,
      lastActivity,
      startedAt: e.started_at,
    }
  }).sort((a, b) => b.progress - a.progress)

  // Métricas globales
  const avgProgress = rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.progress, 0) / rows.length) : 0
  const completedCount = rows.filter(r => r.progress === 100).length
  const activeCount = rows.filter(r => r.status === 'active' && r.progress > 0 && r.progress < 100).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={`/admin/courses/${course.id}`} className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-mocha-700 mb-4">
        <ChevronLeft className="w-4 h-4" />
        Volver al curso
      </Link>

      <div className="mb-6">
        <p className="text-xs text-ink-500 uppercase tracking-wider mb-1">{course.title}</p>
        <h1 className="text-3xl lg:text-4xl font-bold text-ink-900">
          Progreso de alumnos
        </h1>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <MetricBox icon={<Users className="w-4 h-4" />} label="Matriculados" value={rows.length} />
        <MetricBox icon={<TrendingUp className="w-4 h-4" />} label="Avance promedio" value={`${avgProgress}%`} />
        <MetricBox icon={<Clock className="w-4 h-4" />} label="En progreso" value={activeCount} />
        <MetricBox icon={<CheckCircle2 className="w-4 h-4" />} label="Completados" value={completedCount} />
      </div>

      {!rows.length ? (
        <div className="text-center py-16 bg-mocha-50 rounded-xl border border-mocha-100">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-white mb-4 border border-mocha-100">
            <Users className="w-7 h-7 text-mocha-600" />
          </div>
          <h3 className="text-xl font-bold text-ink-900 mb-2">
            Sin alumnos matriculados
          </h3>
          <p className="text-ink-600 max-w-sm mx-auto text-sm mb-6">
            Asigna este curso a tus alumnos desde la sección de alumnos
          </p>
          <Link href="/admin/students" className="btn-primary">
            Asignar alumnos
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 border-b border-ink-200 text-xs uppercase tracking-wider text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-left">Alumno</th>
                  <th className="px-4 py-3 text-left">Progreso</th>
                  <th className="px-4 py-3 text-left">Lecciones</th>
                  <th className="px-4 py-3 text-left">Exámenes</th>
                  <th className="px-4 py-3 text-left">Última actividad</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-mocha-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-mocha-600 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {(row.student?.full_name || row.student?.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-900 truncate">
                            {row.student?.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-ink-500 truncate">{row.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 bg-ink-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${
                            row.progress === 100 ? 'bg-mocha-600' : 'bg-brand-500'
                          }`} style={{ width: `${row.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-ink-700 w-10 text-right">
                          {row.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-600 whitespace-nowrap">
                      {row.completedLessons}/{row.totalLessons}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-600 whitespace-nowrap">
                      {row.attempts > 0 ? (
                        <div>
                          <span className="font-medium">{row.bestScore?.toFixed(0)}%</span>
                          <span className="text-xs text-ink-500 ml-1">({row.attempts} {row.attempts === 1 ? 'intento' : 'intentos'})</span>
                        </div>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {row.lastActivity ? formatDate(row.lastActivity) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ row }: { row: any }) {
  if (row.status === 'revoked') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium whitespace-nowrap">Revocado</span>
  }
  if (row.progress === 100) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-mocha-100 text-mocha-800 font-medium whitespace-nowrap">
      <Award className="w-3 h-3 inline mr-0.5" />
      Completado
    </span>
  }
  if (row.progress > 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium whitespace-nowrap">En curso</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 font-medium whitespace-nowrap">No iniciado</span>
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-mocha-100 text-mocha-700">
        {icon}
      </div>
      <p className="text-xs text-ink-500 mt-3">{label}</p>
      <p className="text-2xl font-bold text-ink-900 mt-0.5">{value}</p>
    </div>
  )
}
