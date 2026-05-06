/**
 * Helper cliente para disparar la verificación de culminación del curso.
 * Se llama desde LessonViewer, QuizRunner y AssignmentForm después de
 * cualquier acción que pueda completar el curso.
 *
 * Retorna { completed, certificateUrl } si ya se completó.
 * Nunca arroja errores visibles; si algo falla, solo lo loguea.
 */
export async function triggerCompletionCheck(enrollmentId: string) {
  try {
    const res = await fetch('/api/enrollments/check-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId }),
    })
    if (!res.ok) return { completed: false }
    return await res.json() as { completed: boolean; certificateUrl?: string }
  } catch (e) {
    console.error('Error triggering completion check:', e)
    return { completed: false }
  }
}
