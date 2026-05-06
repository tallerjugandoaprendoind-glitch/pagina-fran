import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LessonViewer from './LessonViewer'
import CoursePreviewPage from './CoursePreviewPage'
import { ChevronLeft, Award, Download, Eye } from 'lucide-react'

export default async function CourseDetailPage({
  params, searchParams,
}: {
  params: { id: string }
  searchParams: { item?: string }  // "lesson:xxx", "quiz:xxx", "assignment:xxx"
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Detectar si el usuario es admin/instructor (vista previa)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Buscar enrollment del usuario actual
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, final_score, status')
    .eq('course_id', params.id)
    .eq('student_id', user!.id)
    .single()

  // Si no hay enrollment Y no es admin → mostrar preview del curso con CTA de WhatsApp
  if (!enrollment && !isAdmin) {
    const adminClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: coursePreview } = await adminClient
      .from('courses')
      .select(`id, title, description, cover_url, intro_title, intro_video_url, intro_content, cert_preview_url, modules ( id, title, "order", lessons ( id, title, "order" ) )`)
      .eq('id', params.id)
      .eq('is_published', true)
      .single()

    if (!coursePreview) notFound()

    const sortedPreviewModules = (coursePreview.modules as any[])
      .sort((a, b) => a.order - b.order)
      .map(m => ({ ...m, lessons: (m.lessons as any[]).sort((a: any, b: any) => a.order - b.order) }))

    const waMsg = encodeURIComponent(`Hola! Me interesa el curso "${coursePreview.title}". ¿Podrían informarme sobre cómo acceder?`)
    const waUrl = `https://wa.me/51940428169?text=${waMsg}`

    return <CoursePreviewPage
      title={coursePreview.title}
      description={coursePreview.description}
      coverUrl={(coursePreview as any).cover_url}
      introTitle={(coursePreview as any).intro_title}
      introVideoUrl={(coursePreview as any).intro_video_url}
      introContent={(coursePreview as any).intro_content}
      certPreviewUrl={(coursePreview as any).cert_preview_url}
      modules={sortedPreviewModules}
      waUrl={waUrl}
    />
  }

  // Modo vista previa: enrollment ficticio para que el resto del código funcione
  const previewMode = !enrollment && isAdmin
  const effectiveEnrollment = enrollment || {
    id: 'preview',
    final_score: null,
    status: 'preview',
  }

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_url, passing_score,
      modules ( id, title, description, "order",
        lessons ( id, title, video_url, content, "order", duration_minutes )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!course) notFound()

  const { data: progress } = previewMode ? { data: [] } : await supabase
    .from('lesson_progress')
    .select('lesson_id, watch_percentage, completed_at')
    .eq('enrollment_id', effectiveEnrollment.id)

  // Quizzes del curso — con module_id para intercalarlos
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, type, passing_score, module_id, description')
    .eq('course_id', params.id)

  const quizIds = (quizzes || []).map(q => q.id)
  const { data: attempts } = (previewMode || !quizIds.length) ? { data: [] } : await supabase
    .from('quiz_attempts')
    .select('quiz_id, score, passed, submitted_at')
    .eq('enrollment_id', effectiveEnrollment.id)
    .in('quiz_id', quizIds)

  // Assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, instructions, module_id, fields')
    .eq('course_id', params.id)

  const assignmentIds = (assignments || []).map(a => a.id)
  const { data: submissions } = (previewMode || !assignmentIds.length) ? { data: [] } : await supabase
    .from('assignment_submissions')
    .select('assignment_id, submitted_at, score, feedback, answers')
    .eq('enrollment_id', effectiveEnrollment.id)
    .in('assignment_id', assignmentIds)

  // Recursos (Fase 3) - tolerante a que la tabla no exista aún
  const resourcesRes = await supabase
    .from('course_resources')
    .select('id, title, description, resource_type, file_url, file_name, file_size, external_url, module_id, "order"')
    .eq('course_id', params.id)
    .order('order', { ascending: true })
  const resources = resourcesRes.error ? [] : (resourcesRes.data || [])

  // Foros (Fase 3) - tolerante a que la tabla no exista aún
  const forumsRes = await supabase
    .from('course_forums')
    .select('id, title, description, module_id')
    .eq('course_id', params.id)
  const forums = forumsRes.error ? [] : (forumsRes.data || [])

  // Foros donde el alumno ya publicó (para marcarlos como completados)
  const forumIds = forums.map((f: any) => f.id)
  const { data: userForumPosts } = (!previewMode && forumIds.length > 0)
    ? await supabase
        .from('forum_posts')
        .select('forum_id')
        .eq('author_id', user!.id)
        .in('forum_id', forumIds)
    : { data: [] }
  const forumsWithUserPost = [...new Set((userForumPosts || []).map((p: any) => p.forum_id))] as string[]

  const sortedModules = (course.modules as any[])
    .sort((a, b) => a.order - b.order)
    .map(m => ({ ...m, lessons: m.lessons.sort((a: any, b: any) => a.order - b.order) }))

  // Agrupar quizzes, assignments, resources, forums por module_id
  const quizzesByModule: Record<string, any[]> = {}
  const assignmentsByModule: Record<string, any[]> = {}
  const resourcesByModule: Record<string, any[]> = {}
  const forumsByModule: Record<string, any[]> = {}
  const courseLevelQuizzes: any[] = []
  const courseLevelAssignments: any[] = []
  const courseLevelResources: any[] = []
  const courseLevelForums: any[] = []

  for (const q of (quizzes || [])) {
    if (q.module_id) {
      (quizzesByModule[q.module_id] ||= []).push(q)
    } else {
      courseLevelQuizzes.push(q)
    }
  }
  for (const a of (assignments || [])) {
    if (a.module_id) {
      (assignmentsByModule[a.module_id] ||= []).push(a)
    } else {
      courseLevelAssignments.push(a)
    }
  }
  for (const r of (resources || [])) {
    if (r.module_id) {
      (resourcesByModule[r.module_id] ||= []).push(r)
    } else {
      courseLevelResources.push(r)
    }
  }
  for (const f of (forums || [])) {
    if (f.module_id) {
      (forumsByModule[f.module_id] ||= []).push(f)
    } else {
      courseLevelForums.push(f)
    }
  }

  const attemptsByQuiz = new Map((attempts || []).map(a => [a.quiz_id, a]))
  const subsByAssignment = new Map((submissions || []).map(s => [s.assignment_id, s]))

  return (
    <div className="min-h-screen bg-white" style={{ background: '#F7F7F8' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff',
        borderBottom: '1px solid rgba(31,23,16,0.08)',
        padding: '10px 20px',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <Link
            href={previewMode ? `/admin/courses/${course.id}` : '/dashboard'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: '#6B5E4E', textDecoration: 'none',
            }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
            {previewMode ? 'Volver al editor' : 'Mi aprendizaje'}
          </Link>

          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#1F1710',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {course.title}
            </div>
          </div>

          <div style={{ minWidth: 100, display: 'flex', justifyContent: 'flex-end' }}>
            {previewMode && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                background: '#FFF3CD', color: '#7A5A0F',
                border: '1px solid #FFE08A',
                borderRadius: 100,
                fontSize: 11, fontWeight: 700,
              }}>
                <Eye size={13} strokeWidth={2.2} />
                Vista previa (admin)
              </span>
            )}
            {!previewMode && effectiveEnrollment.status === 'completed' && (
              <Link
                href="/certificates"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: '#1F1710', color: '#F4ECDF',
                  borderRadius: 100,
                  fontSize: 12, fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Award size={13} strokeWidth={2.2} />
                Certificado
              </Link>
            )}
          </div>
        </div>
      </div>

      <LessonViewer
        courseId={course.id}
        enrollmentId={effectiveEnrollment.id}
        previewMode={previewMode}
        modules={sortedModules}
        progress={progress || []}
        passingScore={course.passing_score}
        quizzesByModule={quizzesByModule}
        assignmentsByModule={assignmentsByModule}
        resourcesByModule={resourcesByModule}
        forumsByModule={forumsByModule}
        courseLevelQuizzes={courseLevelQuizzes}
        courseLevelAssignments={courseLevelAssignments}
        courseLevelResources={courseLevelResources}
        courseLevelForums={courseLevelForums}
        attemptsByQuizId={Object.fromEntries(attemptsByQuiz)}
        submissionsByAssignmentId={Object.fromEntries(subsByAssignment)}
        forumsWithUserPost={forumsWithUserPost}
        initialItemKey={searchParams.item}
      />
    </div>
  )
}

