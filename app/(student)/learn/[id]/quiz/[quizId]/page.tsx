import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import QuizRunner from '@/components/QuizRunner'

export default async function StudentQuizPage({ params }: { params: { id: string; quizId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', params.id)
    .eq('student_id', user!.id)
    .single()

  if (!enrollment) notFound()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, description, passing_score, max_attempts')
    .eq('id', params.quizId)
    .single()

  if (!quiz) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, type, question_text, options, points, "order"')
    .eq('quiz_id', params.quizId)
    .order('order', { ascending: true })

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link href={`/learn/${params.id}`} className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-mocha-700">
          <ChevronLeft className="w-4 h-4" />
          Volver al curso
        </Link>
      </div>

      <QuizRunner
        quizId={quiz.id}
        quizTitle={quiz.title}
        enrollmentId={enrollment.id}
        questions={(questions as any[]) || []}
        passingScore={quiz.passing_score}
      />
    </div>
  )
}
