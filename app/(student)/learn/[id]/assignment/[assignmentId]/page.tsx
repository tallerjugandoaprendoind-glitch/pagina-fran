import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AssignmentForm from '@/components/AssignmentForm'

export default async function StudentAssignmentPage({ params }: { params: { id: string; assignmentId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', params.id)
    .eq('student_id', user!.id)
    .single()

  if (!enrollment) notFound()

  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, title, instructions, fields')
    .eq('id', params.assignmentId)
    .single()

  if (!assignment) notFound()

  const { data: existing } = await supabase
    .from('assignment_submissions')
    .select('answers, submitted_at, score, feedback')
    .eq('enrollment_id', enrollment.id)
    .eq('assignment_id', params.assignmentId)
    .single()

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link href={`/learn/${params.id}`} className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-mocha-700">
          <ChevronLeft className="w-4 h-4" />
          Volver al curso
        </Link>
      </div>

      <AssignmentForm
        assignmentId={assignment.id}
        enrollmentId={enrollment.id}
        title={assignment.title}
        instructions={assignment.instructions || ''}
        fields={(assignment.fields as any[]) || []}
        existingSubmission={existing as any}
      />
    </div>
  )
}
