import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QuizBuilder from '../new/QuizBuilder'

export default async function EditQuizPage({ params }: { params: { id: string; quizId: string } }) {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses').select('id, title').eq('id', params.id).single()

  if (!course) notFound()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, description, type, passing_score, time_limit_minutes, max_attempts')
    .eq('id', params.quizId)
    .single()

  if (!quiz) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, type, question_text, options, correct_answer, points, explanation, "order"')
    .eq('quiz_id', params.quizId)
    .order('order', { ascending: true })

  const mappedQuestions = (questions || []).map((q: any) => ({
    id: q.id,
    type: q.type,
    question_text: q.question_text,
    options: q.options || [],
    correct_answer: q.correct_answer,
    points: q.points,
    explanation: q.explanation || '',
    _existing: true,
  }))

  return (
    <QuizBuilder
      courseId={course.id}
      courseTitle={course.title}
      initialQuiz={quiz as any}
      initialQuestions={mappedQuestions}
    />
  )
}
