import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { attemptId } = await req.json()
  const supabase = await createClient()

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select(`
      id, quiz_id,
      quizzes ( passing_score ),
      attempt_answers (
        id, question_id, answer,
        questions ( type, correct_answer, points )
      )
    `)
    .eq('id', attemptId)
    .single()

  if (!attempt) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let totalPoints = 0
  let earnedPoints = 0
  let needsReview = false

  for (const ans of (attempt.attempt_answers as any[])) {
    const q = ans.questions
    totalPoints += q.points
    let isCorrect: boolean | null = null
    let pointsEarned = 0

    switch (q.type) {
      case 'single_choice':
      case 'true_false':
        isCorrect = ans.answer === q.correct_answer
        pointsEarned = isCorrect ? q.points : 0
        break
      case 'multiple_choice': {
        const userAns = [...(ans.answer || [])].sort()
        const correctAns = [...(q.correct_answer || [])].sort()
        isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns)
        pointsEarned = isCorrect ? q.points : 0
        break
      }
      case 'short_answer': {
        const userText = (ans.answer || '').toString().trim().toLowerCase()
        const correctText = (q.correct_answer || '').toString().trim().toLowerCase()
        isCorrect = userText === correctText
        pointsEarned = isCorrect ? q.points : 0
        break
      }
      case 'essay':
        needsReview = true
        isCorrect = null
        pointsEarned = 0
        break
    }

    earnedPoints += pointsEarned
    await supabase
      .from('attempt_answers')
      .update({ is_correct: isCorrect, points_earned: pointsEarned })
      .eq('id', ans.id)
  }

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
  const passingScore = (attempt.quizzes as any).passing_score || 80
  const passed = !needsReview && score >= passingScore

  await supabase
    .from('quiz_attempts')
    .update({
      score, passed, needs_review: needsReview,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attemptId)

  return NextResponse.json({ score, passed, needsReview })
}
