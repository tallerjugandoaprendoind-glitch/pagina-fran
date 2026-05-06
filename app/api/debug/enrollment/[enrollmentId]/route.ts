import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/debug/enrollment/[enrollmentId]
 *
 * Endpoint de diagnóstico: muestra en JSON el estado completo
 * de una matriculación para saber por qué no se genera el certificado.
 *
 * Devuelve:
 *   - datos de la matriculación
 *   - datos del curso (incluyendo configuración de certificado)
 *   - cuántas lecciones hay y cuántas completadas
 *   - cuántos quizzes hay y cuáles aprobados
 *   - si existe un certificado
 *   - errores en cada paso
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { enrollmentId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const enrollmentId = params.enrollmentId

  const report: any = {
    enrollmentId,
    userId: user.id,
    checks: {},
  }

  // 1. Traer enrollment + curso
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select(`
      id, status, final_score, started_at, completed_at, student_id, course_id,
      courses (
        id, title, passing_score,
        certificate_template, certificate_hours, certificate_ceus,
        certificate_modality, certificate_area, certificate_event_date
      ),
      profiles:student_id ( id, full_name, email, role )
    `)
    .eq('id', enrollmentId)
    .single()

  if (enrollErr) {
    report.checks.enrollment = {
      ok: false,
      error: enrollErr.message,
      hint: 'Si dice "column does not exist", faltan columnas - ejecuta la migración SQL',
    }
    return NextResponse.json(report, { status: 500 })
  }

  report.enrollment = enrollment
  report.checks.enrollment = { ok: true }

  const course = enrollment.courses as any
  const courseId = course.id

  // 2. Contar lecciones
  const { data: allLessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, modules!inner(course_id)')
    .eq('modules.course_id', courseId)

  const { count: completedLessons } = await supabase
    .from('lesson_progress')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .not('completed_at', 'is', null)

  report.checks.lessons = {
    totalLessons: allLessons?.length || 0,
    completedLessons: completedLessons || 0,
    allCompleted: (completedLessons || 0) >= (allLessons?.length || 0) && (allLessons?.length || 0) > 0,
    error: lessonsErr?.message,
  }

  // 3. Contar quizzes
  const { data: allQuizzes } = await supabase
    .from('quizzes').select('id, title, passing_score').eq('course_id', courseId)

  const quizIds = (allQuizzes || []).map(q => q.id)
  const { data: attempts } = quizIds.length ? await supabase
    .from('quiz_attempts')
    .select('quiz_id, score, passed, submitted_at')
    .eq('enrollment_id', enrollmentId) : { data: [] }

  const bestByQuiz = new Map<string, any>()
  attempts?.forEach((a: any) => {
    const prev = bestByQuiz.get(a.quiz_id)
    if (!prev || a.score > prev.score) bestByQuiz.set(a.quiz_id, a)
  })

  const quizDetail = (allQuizzes || []).map(q => {
    const best = bestByQuiz.get(q.id)
    return {
      quizId: q.id,
      title: q.title,
      passingScore: q.passing_score,
      bestAttempt: best || null,
      passed: best?.passed === true,
    }
  })

  report.checks.quizzes = {
    totalQuizzes: allQuizzes?.length || 0,
    quizDetail,
    allPassed: quizDetail.every(q => q.passed),
    totalAttempts: attempts?.length || 0,
  }

  // 4. Certificado ya existe?
  const { data: existingCert } = await supabase
    .from('certificates')
    .select('id, pdf_url, verification_code, issued_at')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  report.checks.existingCertificate = existingCert || null

  // 5. Variables de entorno requeridas
  report.checks.env = {
    NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SITE_URL_set: !!process.env.NEXT_PUBLIC_SITE_URL,
  }

  // 6. Diagnóstico final
  const diagnosis: string[] = []
  if (!report.checks.lessons.allCompleted) {
    diagnosis.push(`⚠ Solo ${report.checks.lessons.completedLessons} de ${report.checks.lessons.totalLessons} lecciones completadas. Debes completar todas.`)
  }
  if (!report.checks.quizzes.allPassed && report.checks.quizzes.totalQuizzes > 0) {
    const failed = quizDetail.filter(q => !q.passed).map(q => q.title)
    diagnosis.push(`⚠ Quizzes no aprobados: ${failed.join(', ')}`)
  }
  if (enrollment.status === 'completed' && !existingCert) {
    diagnosis.push('⚠ Enrollment está completado pero NO se creó el certificado. Posible problema al generar PDF (mira logs del servidor) o faltan las imágenes en el bucket certificate-assets.')
  }
  if (enrollment.status === 'completed' && existingCert && !existingCert.pdf_url) {
    diagnosis.push('⚠ Certificado creado pero sin pdf_url. El upload al bucket certificates falló.')
  }
  if (enrollment.status !== 'completed' && report.checks.lessons.allCompleted && report.checks.quizzes.allPassed) {
    diagnosis.push('⚠ Debería estar completado pero status sigue siendo "' + enrollment.status + '". Probablemente checkAndCompleteEnrollment nunca se llamó, o falló.')
  }
  if (!course.certificate_template) {
    diagnosis.push('⚠ El curso no tiene `certificate_template` configurado. Ve a la pestaña Configuración del curso y elige una plantilla (CEU/IBT/IBA).')
  }
  if (diagnosis.length === 0) {
    diagnosis.push('✓ Todo parece estar en orden.')
  }
  report.diagnosis = diagnosis

  return NextResponse.json(report, { status: 200 })
}
