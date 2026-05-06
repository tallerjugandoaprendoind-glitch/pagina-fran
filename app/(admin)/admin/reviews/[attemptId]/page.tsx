
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ReviewForm from './ReviewForm'
export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({ params }: { params: { attemptId: string } }) {
  const supabase = await createClient()

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select(`
      id, score, passed, needs_review, submitted_at,
      quizzes ( id, title, type, passing_score ),
      enrollments ( id,
        profiles:student_id ( full_name, email ),
        courses ( id, title )
      ),
      attempt_answers (
        id, answer, is_correct, points_earned, feedback,
        questions ( id, type, question_text, correct_answer, options, points, explanation, "order" )
      )
    `)
    .eq('id', params.attemptId)
    .single()

  if (!attempt) notFound()

  const sortedAnswers = ((attempt.attempt_answers as any[]) || [])
    .sort((a, b) => (a.questions?.order || 0) - (b.questions?.order || 0))

  const student = (attempt.enrollments as any)?.profiles
  const course = (attempt.enrollments as any)?.courses
  const quiz = attempt.quizzes as any

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/admin/reviews" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-mocha-700 mb-4">
        <ChevronLeft className="w-4 h-4" />
        Volver a revisiones
      </Link>

      <div className="card p-5 mb-6 bg-mocha-50 border-mocha-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-mocha-600 text-white flex items-center justify-center font-medium flex-shrink-0">
            {(student?.full_name || student?.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-ink-900">
              {student?.full_name || 'Sin nombre'}
            </p>
            <p className="text-sm text-ink-600 truncate">{student?.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 bg-white rounded-full text-ink-700">
                {course?.title}
              </span>
              <span className="px-2 py-0.5 bg-white rounded-full text-ink-700">
                {quiz?.title}
              </span>
              {attempt.submitted_at && (
                <span className="text-ink-500">
                  Enviado el {new Date(attempt.submitted_at).toLocaleDateString('es-ES')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReviewForm
        attemptId={attempt.id}
        quizPassingScore={quiz?.passing_score || 80}
        enrollmentId={(attempt.enrollments as any).id}
        answers={sortedAnswers}
      />
    </div>
  )
}
