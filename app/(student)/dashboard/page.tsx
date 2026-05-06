import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CapyMascot } from '@/components/ui/CapyLogo'
import { Play, Clock, Award, TrendingUp, BookOpen, ArrowRight, Lock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id, status, final_score, started_at, completed_at,
      courses ( id, title, description, cover_url, passing_score,
        modules ( lessons ( id, duration_minutes ) )
      )
    `)
    .eq('student_id', user!.id)
    .order('started_at', { ascending: false })

  // Calcular progreso real desde lesson_progress
  const enrollmentIds = (enrollments || []).map(e => e.id)
  const { data: progressRows } = enrollmentIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('enrollment_id, lesson_id, completed_at')
        .in('enrollment_id', enrollmentIds)
    : { data: [] }

  const completedRows = (progressRows || []).filter(p => p.completed_at)

  // Mapa: enrollment_id → % de lecciones completadas
  const progressMap: Record<string, number> = {}
  for (const e of (enrollments || [])) {
    const course = (e as any).courses
    const totalLessons = (course?.modules || []).flatMap((m: any) => m.lessons || []).length
    const completedLessons = completedRows.filter(p => p.enrollment_id === e.id).length
    progressMap[e.id] = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0
  }

  // Total de lecciones completadas (para stat "Lecciones")
  const totalCompletedLessons = completedRows.length

  // Horas: suma de duration_minutes de lecciones completadas
  const lessonDurMap: Record<string, number> = {}
  for (const e of (enrollments || [])) {
    const course = (e as any).courses
    for (const mod of (course?.modules || [])) {
      for (const lesson of (mod.lessons || [])) {
        lessonDurMap[lesson.id] = lesson.duration_minutes || 0
      }
    }
  }
  const totalMinutes = completedRows.reduce((sum, p) => sum + (lessonDurMap[p.lesson_id] || 0), 0)
  const totalHours = totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ''}`.trim() : totalMinutes > 0 ? `${totalMinutes}m` : '0h'

  const active = enrollments?.filter(e => e.status === 'active') || []
  const completed = enrollments?.filter(e => e.status === 'completed') || []
  const firstName = profile?.full_name?.split(' ')[0] || 'Alumno'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-ink-900 tracking-tight mb-1 tracking-tight">
          Hola, {firstName}
        </h1>
        <p className="text-ink-600">
          {active.length > 0 ? 'Continúa donde lo dejaste' : 'Bienvenido a tu panel de aprendizaje'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <QuickStat icon={<BookOpen className="w-4 h-4" />} label="En curso" value={active.length} />
        <QuickStat icon={<Award className="w-4 h-4" />} label="Completados" value={completed.length} />
        <QuickStat icon={<Clock className="w-4 h-4" />} label="Horas" value={totalHours} />
        <QuickStat icon={<TrendingUp className="w-4 h-4" />} label="Lecciones" value={totalCompletedLessons} />
      </div>

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-ink-900 mb-4 tracking-tight">
            Continúa aprendiendo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.slice(0, 2).map((e: any) => (
              <ContinueCard key={e.id} enrollment={e} progress={progressMap[e.id] ?? 0} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ink-900 tracking-tight">Todos mis cursos</h2>
          <span className="text-sm text-ink-500">
            {(enrollments?.length || 0)} {(enrollments?.length || 0) === 1 ? 'curso' : 'cursos'}
          </span>
        </div>

        {!enrollments?.length ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {enrollments.map((e: any) => (
              <CourseCard key={e.id} enrollment={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-lg border border-ink-200 bg-white shadow-card">
      <div className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-mocha-100 text-mocha-700">
        {icon}
      </div>
      <p className="text-xs text-ink-500 mt-3 font-medium">{label}</p>
      <p className="text-2xl font-bold text-ink-900 mt-0.5 tracking-tight">{value}</p>
    </div>
  )
}

function ContinueCard({ enrollment, progress }: { enrollment: any; progress: number }) {
  const course = enrollment.courses
  return (
    <Link href={`/learn/${course.id}`} className="card card-hover flex overflow-hidden group">
      <div className="w-32 flex-shrink-0 bg-mocha-100 flex items-center justify-center relative overflow-hidden">
        {course.cover_url ? (
          <img
            src={course.cover_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <CapyMascot size={64} className="opacity-70" />
        )}
      </div>
      <div className="flex-1 p-5">
        <p className="text-xs text-mocha-700 font-semibold uppercase tracking-wide mb-1">
          En progreso
        </p>
        <h3 className="text-base font-semibold text-ink-900 line-clamp-2 mb-3 group-hover:text-mocha-700 transition">
          {course.title}
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-ink-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-mocha-600 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-semibold text-ink-700">{progress}%</span>
        </div>
      </div>
    </Link>
  )
}

function CourseCard({ enrollment }: { enrollment: any }) {
  const course = enrollment.courses
  return (
    <Link href={`/learn/${course.id}`} className="card card-hover group">
      <div className="aspect-video bg-mocha-100 flex items-center justify-center relative overflow-hidden">
        {course.cover_url ? (
          <img
            src={course.cover_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <CapyMascot size={56} className="opacity-70" />
        )}
        {enrollment.status === 'completed' && (
          <div className="absolute top-3 right-3 badge badge-mocha">
            <Award className="w-3 h-3" />
            Completado
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-ink-900 line-clamp-2 mb-2 leading-snug group-hover:text-mocha-700 transition">
          {course.title}
        </h3>
        <p className="text-xs text-ink-500 line-clamp-2 mb-3 leading-relaxed">
          {course.description || 'Curso online con certificación'}
        </p>

        {enrollment.final_score ? (
          <div className="flex items-center gap-1.5 pt-3 border-t border-ink-100">
            <Award className="w-3.5 h-3.5 text-mocha-600" />
            <span className="text-xs font-semibold text-ink-800">Nota: {enrollment.final_score}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-3 border-t border-ink-100">
            <Play className="w-3 h-3 text-ink-500" />
            <span className="text-xs text-ink-600 font-medium">Empezar curso</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-mocha-200 bg-gradient-to-br from-mocha-50 to-white p-10">
      <div className="max-w-xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <CapyMascot size={160} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-mocha-200 text-xs font-semibold text-mocha-700 mb-4">
          <Lock className="w-3 h-3" />
          Esperando asignación
        </div>

        <h3 className="text-2xl font-bold text-ink-900 mb-2 tracking-tight">
          Aún no tienes cursos asignados
        </h3>
        <p className="text-ink-600 mb-6 leading-relaxed">
          Tu instructor debe habilitarte los cursos que debes tomar. <br className="hidden sm:block" />
          Mientras tanto, puedes explorar el catálogo.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/catalog" className="btn-primary">
            Explorar catálogo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  )
}
