import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateCertificatePDF, CertificateTemplate, CertificateModality, CertificateArea } from '@/lib/certificates/certificate-pdf'

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req)
  } catch (e: any) {
    console.error('[/api/certificates] Error inesperado:', e)
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + (e?.message ?? 'desconocido') },
      { status: 500 }
    )
  }
}

async function handlePost(req: NextRequest) {
  const { enrollmentId } = await req.json()
  console.log('[certificates] enrollmentId:', enrollmentId)

  if (!enrollmentId) {
    return NextResponse.json({ error: 'enrollmentId requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  // service_role client for writes that RLS blocks for students
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[certificates] user:', user?.id, 'authError:', authError)
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Datos de la matriculación — incluye columnas de certificado del curso
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select(`
      id, student_id, course_id, final_score, completed_at, status,
      courses (
        id, title, passing_score,
        certificate_template, certificate_hours, certificate_ceus,
        certificate_modality, certificate_area, certificate_event_date
      ),
      profiles:student_id ( id, full_name, email )
    `)
    .eq('id', enrollmentId)
    .single()

  console.log('[certificates] enrollment error:', JSON.stringify(error))
  console.log('[certificates] enrollment data:', JSON.stringify(enrollment))

  if (error || !enrollment) {
    return NextResponse.json({ error: 'Matriculación no encontrada: ' + error?.message }, { status: 404 })
  }

  const student = enrollment.profiles as any
  const course = enrollment.courses as any

  // Permisos: el propio alumno o un admin
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isOwner = student?.id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  // Validación: debe estar aprobado
  const passingScore = course?.passing_score ?? 80
  if (!enrollment.final_score || enrollment.final_score < passingScore) {
    return NextResponse.json(
      { error: `Aún no aprobado (nota mínima: ${passingScore}%)` },
      { status: 400 }
    )
  }

  // Si ya existe un certificado con PDF, devolverlo
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, pdf_url, verification_code')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  if (existing?.pdf_url) {
    return NextResponse.json({
      url: existing.pdf_url,
      verificationCode: existing.verification_code,
      cached: true,
    })
  }

  // Si existe pero sin pdf_url (huerfano de un intento fallido), borrarlo para reintentar
  if (existing && !existing.pdf_url) {
    await admin.from('certificates').delete().eq('id', existing.id)
  }

  // Crear el registro del certificado (service_role — RLS bloquea INSERT a alumnos)
  const { data: cert, error: insertErr } = await admin
    .from('certificates')
    .insert({
      enrollment_id: enrollmentId,
      student_name: student.full_name || student.email,
      course_title: course.title,
      final_score: enrollment.final_score,
    })
    .select('id, verification_code, issued_at')
    .single()

  console.log('[certificates] insertErr:', JSON.stringify(insertErr))
  console.log('[certificates] cert:', JSON.stringify(cert))

  if (insertErr || !cert) {
    return NextResponse.json(
      { error: insertErr?.message || 'Error al crear certificado' },
      { status: 500 }
    )
  }

  const year = new Date(cert.issued_at).getFullYear()
  const certificateNumber = `CAPY-${year}-${cert.verification_code.toUpperCase().slice(0, 8)}`

  // Generar PDF — assets se leen desde public/certificate-assets/ vía fs
  try {
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

    const fileName = `${cert.verification_code}.pdf`
    const { error: uploadError } = await admin.storage
      .from('certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      await admin.from('certificates').delete().eq('id', cert.id)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = admin.storage
      .from('certificates')
      .getPublicUrl(fileName)

    await admin
      .from('certificates')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', cert.id)

    return NextResponse.json({
      url: urlData.publicUrl,
      verificationCode: cert.verification_code,
      certificateNumber,
      cached: false,
    })
  } catch (e: any) {
    // Si el PDF falla, limpiar el registro
    await admin.from('certificates').delete().eq('id', cert.id)
    console.error('Error generando PDF:', e)
    return NextResponse.json({ error: 'Error al generar el PDF: ' + e.message }, { status: 500 })
  }
}
