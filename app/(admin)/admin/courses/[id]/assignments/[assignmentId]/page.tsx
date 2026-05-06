import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AssignmentBuilder from '../new/AssignmentBuilder'

export default async function EditAssignmentPage({ params }: { params: { id: string; assignmentId: string } }) {
  const supabase = await createClient()

  const { data: course } = await supabase.from('courses').select('id, title').eq('id', params.id).single()
  if (!course) notFound()

  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, title, instructions, due_days, fields')
    .eq('id', params.assignmentId)
    .single()

  if (!assignment) notFound()

  const initial = {
    ...assignment,
    fields: ((assignment.fields as any[]) || []).map((f: any) => ({ ...f, _existing: true })),
  }

  return <AssignmentBuilder courseId={course.id} courseTitle={course.title} initial={initial as any} />
}
