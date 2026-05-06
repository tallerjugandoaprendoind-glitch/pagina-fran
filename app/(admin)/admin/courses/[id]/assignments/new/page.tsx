import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AssignmentBuilder from './AssignmentBuilder'

export default async function NewAssignmentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('id, title').eq('id', params.id).single()
  if (!course) notFound()
  return <AssignmentBuilder courseId={course.id} courseTitle={course.title} />
}
