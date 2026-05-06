import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndCompleteEnrollment } from '@/lib/certificates/auto-complete'

/**
 * POST /api/enrollments/check-completion
 * Body: { enrollmentId: string }
 *
 * Se llama desde el cliente después de:
 *   - Marcar una lección como completada
 *   - Enviar un quiz (aprobado o no)
 *   - Entregar una asignación
 *
 * La función checkAndCompleteEnrollment es idempotente — si no corresponde
 * completar (falta contenido), no hace nada.
 * Si sí corresponde, marca la matriculación como completed y genera el certificado.
 */
export async function POST(req: NextRequest) {
  const { enrollmentId } = await req.json()

  if (!enrollmentId) {
    return NextResponse.json({ error: 'enrollmentId requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar que la matriculación pertenece al usuario o que es admin
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('id', enrollmentId)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'Matriculación no encontrada' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isOwner = enrollment.student_id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const result = await checkAndCompleteEnrollment(enrollmentId)

  return NextResponse.json(result)
}
