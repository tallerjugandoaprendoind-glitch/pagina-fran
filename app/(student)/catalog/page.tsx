import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { CapyMascot } from '@/components/ui/CapyLogo'
import { Lock, CheckCircle2, BookOpen, MessageCircle } from 'lucide-react'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cliente con service_role para bypassear RLS y ver todos los cursos publicados
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: allCourses } = await adminClient
    .from('courses')
    .select('id, title, description, cover_url, passing_score, is_published, intro_title, intro_video_url')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const { data: myEnrollments } = await supabase
    .from('enrollments')
    .select('course_id, status')
    .eq('student_id', user!.id)

  const enrolledIds = new Set((myEnrollments || []).map(e => e.course_id))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-ink-900 tracking-tight mb-1 tracking-tight">
          Catálogo de cursos
        </h1>
        <p className="text-ink-600">
          Todos los cursos disponibles. Solicita a tu instructor acceso a los que necesites.
        </p>
      </div>

      {!allCourses?.length ? (
        <div className="text-center py-20 bg-mocha-50 rounded-xl border border-mocha-100">
          <CapyMascot size={120} className="mx-auto mb-4" />
          <h3 className="text-xl font-bold text-ink-900 mb-2 tracking-tight">
            Pronto habrá cursos
          </h3>
          <p className="text-ink-600 max-w-sm mx-auto text-sm">
            Los instructores están preparando nuevo contenido
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allCourses.map((course) => (
            <CatalogCard key={course.id} course={course} isEnrolled={enrolledIds.has(course.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function CatalogCard({ course, isEnrolled }: { course: any; isEnrolled: boolean }) {
  if (isEnrolled) {
    return (
      <Link href={`/learn/${course.id}`} className="card card-hover group">
        <div className="aspect-video bg-mocha-100 flex items-center justify-center relative overflow-hidden">
          {course.cover_url
            ? <Image src={course.cover_url} alt={course.title} fill className="object-cover" />
            : <CapyMascot size={56} className="opacity-70" />
          }
          <div className="absolute top-3 right-3 badge badge-mocha">
            <CheckCircle2 className="w-3 h-3" />
            Disponible
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-base font-semibold text-ink-900 line-clamp-2 mb-2 leading-snug group-hover:text-mocha-700 transition">
            {course.title}
          </h3>
          <p className="text-xs text-ink-500 line-clamp-2 mb-3 leading-relaxed">
            {course.description || 'Curso online con certificación'}
          </p>
          <div className="flex items-center gap-1.5 pt-3 border-t border-ink-100">
            <BookOpen className="w-3.5 h-3.5 text-mocha-600" />
            <span className="text-xs font-semibold text-mocha-700">Acceder al curso</span>
          </div>
        </div>
      </Link>
    )
  }

  const waMsg = encodeURIComponent(`Hola! Me interesa el curso "${course.title}". ¿Podrían informarme sobre cómo acceder?`)
  const waUrl = `https://wa.me/51940428169?text=${waMsg}`

  return (
    <div className="card relative group flex flex-col">
      <Link href={`/learn/${course.id}`} className="block" style={{ textDecoration: 'none' }}>
        <div className="aspect-video bg-ink-100 flex items-center justify-center relative overflow-hidden">
          {course.cover_url
            ? <Image src={course.cover_url} alt={course.title} fill className="object-cover" />
            : <CapyMascot size={56} className="opacity-30 grayscale" />
          }
          <div className="absolute top-3 right-3 badge bg-ink-700 text-white">
            <Lock className="w-3 h-3" />
            Bloqueado
          </div>
        </div>
        <div className="p-4 pb-2">
          <h3 className="text-base font-semibold text-ink-700 line-clamp-2 mb-2 leading-snug group-hover:text-mocha-700 transition">
            {course.title}
          </h3>
          <p className="text-xs text-ink-500 line-clamp-2 mb-2 leading-relaxed">
            {course.description || 'Curso online con certificación'}
          </p>
          <div className="flex items-center gap-1.5 pb-3 border-b border-ink-100">
            <BookOpen className="w-3.5 h-3.5 text-ink-400" />
            <span className="text-xs text-ink-500">Ver introducción</span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 pt-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-lg py-2 text-xs font-semibold text-white transition"
          style={{ background: '#25D366', textDecoration: 'none' }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Solicitar acceso
        </a>
      </div>
    </div>
  )
}
