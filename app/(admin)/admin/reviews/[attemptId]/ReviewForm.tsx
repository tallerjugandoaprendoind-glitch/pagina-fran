'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, FileText, Save, AlertCircle } from 'lucide-react'

type AnswerWithQuestion = {
  id: string
  answer: any
  is_correct: boolean | null
  points_earned: number | null
  feedback: string | null
  questions: {
    id: string
    type: string
    question_text: string
    correct_answer: any
    options: any
    points: number
    explanation: string | null
  }
}

type Props = {
  attemptId: string
  enrollmentId: string
  quizPassingScore: number
  answers: AnswerWithQuestion[]
}

export default function ReviewForm({ attemptId, enrollmentId, quizPassingScore, answers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado de cada respuesta
  const [reviews, setReviews] = useState(
    answers.reduce((acc, a) => {
      acc[a.id] = {
        points_earned: a.points_earned ?? (a.is_correct === true ? a.questions.points : 0),
        feedback: a.feedback || '',
        is_correct: a.is_correct,
      }
      return acc
    }, {} as Record<string, { points_earned: number; feedback: string; is_correct: boolean | null }>)
  )

  const totalPoints = answers.reduce((sum, a) => sum + a.questions.points, 0)
  const earnedPoints = Object.values(reviews).reduce((sum, r) => sum + (r.points_earned || 0), 0)
  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
  const passed = score >= quizPassingScore

  function updateReview(answerId: string, patch: Partial<typeof reviews[string]>) {
    setReviews({ ...reviews, [answerId]: { ...reviews[answerId], ...patch } })
  }

  async function handleFinalize() {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    // 1. Guardar cada respuesta con su calificación
    for (const a of answers) {
      const r = reviews[a.id]
      await supabase.from('attempt_answers').update({
        points_earned: r.points_earned,
        is_correct: r.points_earned > 0,
        feedback: r.feedback || null,
      }).eq('id', a.id)
    }

    // 2. Actualizar el intento
    await supabase.from('quiz_attempts').update({
      score, passed,
      needs_review: false,
    }).eq('id', attemptId)

    setSaving(false)
    router.push('/admin/reviews')
    router.refresh()
  }

  return (
    <div>
      {error && (
        <div className="flex items-start gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {answers.map((a, i) => (
          <AnswerReview
            key={a.id}
            index={i}
            answer={a}
            review={reviews[a.id]}
            onUpdate={(patch) => updateReview(a.id, patch)}
          />
        ))}
      </div>

      {/* Resumen y finalizar */}
      <div className="card p-6 sticky bottom-4 bg-white border-2 border-mocha-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-500 uppercase tracking-wider mb-1">Calificación final</p>
            <p className="text-4xl font-bold text-mocha-700">
              {score.toFixed(1)}%
            </p>
            <p className="text-xs text-ink-600 mt-1">
              {earnedPoints} / {totalPoints} puntos · Aprobación: {quizPassingScore}%
            </p>
          </div>

          <div className="flex items-center gap-3">
            {passed ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mocha-100 text-mocha-800 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Aprobado
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                <XCircle className="w-4 h-4" />
                No aprobado
              </div>
            )}
            <button onClick={handleFinalize} disabled={saving} className="btn-primary disabled:opacity-60">
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Guardando...' : 'Finalizar revisión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnswerReview({
  index, answer, review, onUpdate,
}: {
  index: number
  answer: AnswerWithQuestion
  review: { points_earned: number; feedback: string; is_correct: boolean | null }
  onUpdate: (patch: Partial<{ points_earned: number; feedback: string; is_correct: boolean | null }>) => void
}) {
  const q = answer.questions
  const maxPoints = q.points

  // Determinar si es auto-calificable o requiere revisión
  const isAutoGraded = q.type !== 'essay' && answer.is_correct !== null

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-ink-500 font-medium">Pregunta {index + 1}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-mocha-100 text-mocha-800 font-medium">
              {q.type === 'essay' ? 'Ensayo (manual)' : 'Auto-corregida'}
            </span>
            <span className="text-xs text-ink-500">· {maxPoints} {maxPoints === 1 ? 'pt' : 'pts'}</span>
          </div>
          <p className="font-medium text-ink-900">{q.question_text}</p>
        </div>
      </div>

      {/* Respuesta del alumno */}
      <div className="bg-ink-50 rounded-md p-4 mb-4">
        <p className="text-xs font-medium text-ink-600 mb-1.5">Respuesta del alumno:</p>
        <AnswerDisplay type={q.type} answer={answer.answer} options={q.options} />
      </div>

      {/* Respuesta esperada (solo autocalificables no-ensayo) */}
      {q.type !== 'essay' && q.correct_answer !== null && (
        <div className="bg-mocha-50 rounded-md p-4 mb-4 border border-mocha-100">
          <p className="text-xs font-medium text-mocha-700 mb-1.5">Respuesta esperada:</p>
          <AnswerDisplay type={q.type} answer={q.correct_answer} options={q.options} />
        </div>
      )}

      {/* Puntaje + feedback */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-ink-100">
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Puntos otorgados</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={maxPoints}
              step={0.5}
              value={review.points_earned}
              onChange={(e) => onUpdate({
                points_earned: Math.min(maxPoints, Math.max(0, Number(e.target.value))),
                is_correct: Number(e.target.value) > 0,
              })}
              className="input-base text-sm"
            />
            <span className="text-sm text-ink-500">/ {maxPoints}</span>
          </div>
          {q.type !== 'essay' && (
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => onUpdate({ points_earned: maxPoints, is_correct: true })}
                className="text-xs px-2 py-1 rounded bg-mocha-100 text-mocha-800 hover:bg-mocha-200"
              >
                Correcto ({maxPoints})
              </button>
              <button
                onClick={() => onUpdate({ points_earned: 0, is_correct: false })}
                className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
              >
                Incorrecto (0)
              </button>
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-ink-600 mb-1">
            Feedback (opcional, se muestra al alumno)
          </label>
          <textarea
            value={review.feedback}
            onChange={(e) => onUpdate({ feedback: e.target.value })}
            className="input-base text-sm"
            rows={2}
            placeholder="Comentarios para el alumno..."
          />
        </div>
      </div>
    </div>
  )
}

function AnswerDisplay({ type, answer, options }: { type: string; answer: any; options: any }) {
  if (answer === null || answer === undefined || answer === '') {
    return <p className="text-sm text-ink-400 italic">Sin respuesta</p>
  }

  if (type === 'single_choice') {
    const opt = (options || []).find((o: any) => o.id === answer)
    return <p className="text-sm text-ink-800">{opt?.text || answer}</p>
  }

  if (type === 'multiple_choice') {
    const selected = (options || []).filter((o: any) => (answer || []).includes(o.id))
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {selected.map((o: any) => (
          <li key={o.id} className="text-sm text-ink-800">{o.text}</li>
        ))}
      </ul>
    )
  }

  if (type === 'true_false') {
    return <p className="text-sm text-ink-800 font-medium">{answer === 'true' ? 'Verdadero' : 'Falso'}</p>
  }

  // short_answer, essay
  return <p className="text-sm text-ink-800 whitespace-pre-wrap">{answer}</p>
}
