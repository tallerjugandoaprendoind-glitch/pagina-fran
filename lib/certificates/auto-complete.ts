import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateCertificatePDF, CertificateTemplate, CertificateModality, CertificateArea } from '@/lib/certificates/certificate-pdf'

/**
 * Usa service_role para bypass de RLS en todas las operaciones de escritura
 * (los alumnos no tienen permiso de INSERT en certificates ni de cambiar status en enrollments).
 */
export async function checkAndCompleteEnrollment(
  enrollmentId: string
): Promise<{ completed: boolean; certificateUrl?: string; error?: string }> {
  console.log(`\n🔍 [checkAndCompleteEnrollment] Iniciando para enrollment ${enrollmentId}`)
  const supabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // 1. Obtener la matriculación y curso
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select(`
      id, status, final_score, student_id, course_id,
      courses (
        id, title, passing_score,
        certificate_template, certificate_hours, certificate_ceus,
        certificate_modality, certificate_area, certificate_event_date
      ),
      profiles:student_id ( id, full_name, email )
    `)
    .eq('id', enrollmentId)
    .single()

  if (enrollErr) {
    console.error(`❌ Error cargando enrollment:`, enrollErr.message)
    return { completed: false, error: enrollErr.message }
  }
  if (!enrollment) {
    console.error(`❌ Enrollment no encontrado`)
    return { completed: false, error: 'Enrollment no encontrado' }
  }

  console.log(`   Status actual: ${enrollment.status}`)

  if (enrollment.status === 'completed') {
    console.log(`   Ya completado, buscando certificado existente…`)
    const { data: existing } = await supabase
      .from('certificates')
      .select('pdf_url')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle()
    console.log(`   PDF URL: ${existing?.pdf_url || 'NO EXISTE'}`)
    return { completed: true, certificateUrl: existing?.pdf_url || undefined }
  }
  if (enrollment.status === 'revoked') {
    console.log(`   Revocado, saltando`)
    return { completed: false }
  }

  const course = enrollment.courses as any
  const student = enrollment.profiles as any
  const passingScore = course.passing_score ?? 80
  console.log(`   Curso: "${course.title}" · passing_score=${passingScore} · template=${course.certificate_template || 'NO SET'}`)

  // 2. Verificar lecciones
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, modules!inner(course_id)')
    .eq('modules.course_id', course.id)

  const totalLessons = allLessons?.length || 0
  console.log(`   Lecciones totales: ${totalLessons}`)

  if (totalLessons === 0) {
    console.log(`   ⚠ Curso sin lecciones, abortando`)
    return { completed: false }
  }

  const { count: completedLessons } = await supabase
    .from('lesson_progress')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .not('completed_at', 'is', null)

  console.log(`   Lecciones completadas: ${completedLessons}/${totalLessons}`)

  if ((completedLessons || 0) < totalLessons) {
    console.log(`   ⏸ Aún faltan lecciones`)
    return { completed: false }
  }

  // 3. Verificar quizzes
  const { data: allQuizzes } = await supabase
    .from('quizzes').select('id, title').eq('course_id', course.id)

  console.log(`   Quizzes totales: ${allQuizzes?.length || 0}`)

  let avgScore: number | null = null
  if (allQuizzes && allQuizzes.length > 0) {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('quiz_id, score, passed')
      .eq('enrollment_id', enrollmentId)
      .eq('passed', true)

    console.log(`   Intentos aprobados: ${attempts?.length || 0}`)

    const bestByQuiz = new Map<string, number>()
    attempts?.forEach((a: any) => {
      const prev = bestByQuiz.get(a.quiz_id) ?? -1
      if (a.score > prev) bestByQuiz.set(a.quiz_id, a.score)
    })

    const allPassed = allQuizzes.every((q: any) => bestByQuiz.has(q.id))
    if (!allPassed) {
      const notPassed = allQuizzes.filter((q: any) => !bestByQuiz.has(q.id)).map((q: any) => q.title)
      console.log(`   ⏸ Quizzes sin aprobar: ${notPassed.join(', ')}`)
      return { completed: false }
    }

    const scores = Array.from(bestByQuiz.values())
    avgScore = scores.reduce((s, v) => s + v, 0) / scores.length
    console.log(`   Score promedio: ${avgScore}`)
  } else {
    avgScore = 100
    console.log(`   Sin quizzes → score 100 por defecto`)
  }

  if (avgScore < passingScore) {
    console.log(`   ⚠ Score (${avgScore}) < passingScore (${passingScore}), no completa`)
    return { completed: false }
  }

  // 4. Marcar completado
  console.log(`   ✅ Marcando como completado…`)
  const { error: updErr } = await supabase
    .from('enrollments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_score: Math.round(avgScore * 100) / 100,
    })
    .eq('id', enrollmentId)

  if (updErr) {
    console.error(`   ❌ Error marcando completed:`, updErr.message)
    return { completed: false, error: updErr.message }
  }

  // 5. Generar certificado
  console.log(`   📜 Generando certificado…`)
  try {
    const { data: cert, error: certErr } = await supabase
      .from('certificates')
      .insert({
        enrollment_id: enrollmentId,
        student_name: student.full_name || student.email,
        course_title: course.title,
        final_score: Math.round(avgScore * 100) / 100,
      })
      .select('id, verification_code, issued_at')
      .single()

    if (certErr || !cert) {
      console.error(`   ❌ Error insertando certificado:`, certErr)
      return { completed: true, error: 'Error insertando certificado: ' + (certErr?.message || 'desconocido') }
    }

    console.log(`   Cert creado: ${cert.id} · code=${cert.verification_code}`)

    const year = new Date(cert.issued_at).getFullYear()
    const certificateNumber = `CAPY-${year}-${cert.verification_code.toUpperCase().slice(0, 8)}`

    console.log(`   Generando PDF con template=${course.certificate_template || 'ceu'}`)
    console.log(`   Assets desde: public/certificate-assets/`)

    // Assets se leen desde el filesystem (public/certificate-assets/), sin red
    const pdfBytes = await generateCertificatePDF({
      studentName: student.full_name || student.email,
      courseTitle: course.title,
      issuedAt: new Date(cert.issued_at),
      verificationCode: cert.verification_code,
      certificateNumber,
      template: (course.certificate_template || 'ceu') as CertificateTemplate,
      hours: course.certificate_hours,
      ceus: course.certificate_ceus,
      modality: (course.certificate_modality || 'online') as CertificateModality,
      area: (course.certificate_area || 'topicos_aba') as CertificateArea,
      eventDate: course.certificate_event_date ? new Date(course.certificate_event_date) : null,
    })

    console.log(`   PDF generado, ${pdfBytes.byteLength} bytes. Subiendo…`)

    const fileName = `${cert.verification_code}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error(`   ❌ Error subiendo PDF:`, uploadError.message)
      console.error(`   💡 Hint: el bucket "certificates" probablemente no existe. Crea el bucket o ejecuta la migration.`)
      return { completed: true, error: 'Upload falló: ' + uploadError.message }
    }

    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName)

    await supabase
      .from('certificates')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', cert.id)

    console.log(`   ✅ Certificado generado: ${urlData.publicUrl}`)
    return { completed: true, certificateUrl: urlData.publicUrl }
  } catch (e: any) {
    console.error(`   ❌ Excepción generando certificado:`, e)
    console.error(`   Stack:`, e.stack)
    return { completed: true, error: e.message }
  }
}
