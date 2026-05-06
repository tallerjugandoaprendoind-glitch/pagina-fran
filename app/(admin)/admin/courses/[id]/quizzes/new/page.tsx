import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QuizBuilder from './QuizBuilder'

export default async function NewQuizPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('id, title').eq('id', params.id).single()
  if (!course) notFound()
  return <QuizBuilder courseId={course.id} courseTitle={course.title} />
}
