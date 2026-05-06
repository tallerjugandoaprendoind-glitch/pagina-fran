'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { CapyMascot } from '@/components/ui/CapyLogo'

type Question = {
  id: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  question_text: string
  options?: { id: string; text: string }[]
  points: number
}

type Props = {
  quizId: string
  quizTitle: string
  enrollmentId: string
  questions: Question[]
  passingScore: number
}

export default function QuizRunner({ quizId, quizTitle, enrollmentId, questions, passingScore }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean; needsReview: boolean } | null>(null)

  async function submit() {
    setSubmitting(true)
    const supabase = createClient()

    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .insert({
        enrollment_id: enrollmentId,
        quiz_id: quizId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!attempt) { setSubmitting(false); return }

    const answerRows = questions.map((q) => ({
      attempt_id: attempt.id,
      question_id: q.id,
      answer: answers[q.id] ?? null,
    }))
    await supabase.from('attempt_answers').insert(answerRows)

    const res = await fetch('/api/quiz/grade', {
      method: 'POST',
      body: JSON.stringify({ attemptId: attempt.id }),
    })
    const data = await res.json()
    setResult(data)
    setSubmitting(false)
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <CapyMascot size={160} className="mx-auto mb-6" />
        <h2 className="text-3xl font-bold mb-2">
          {result.needsReview ? 'Enviado para revisión' : result.passed ? '¡Aprobado!' : 'No aprobado'}
        </h2>
        {!result.needsReview && (
          <p className={`text-5xl font-semibold my-6 ${result.passed ? 'text-mocha-600' : 'text-red-600'}`}>
            {result.score.toFixed(1)}%
          </p>
        )}
        {result.needsReview && (
          <p className="text-ink-600 my-6">
            Tu examen contiene preguntas que requieren revisión manual.
            Tu instructor calificará pronto.
          </p>
        )}
        <p className="text-sm text-ink-500">
          Umbral de aprobación: {passingScore}%
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink-900">{quizTitle}</h1>
        <p className="text-sm text-ink-600 mt-1">
          {questions.length} preguntas · Aprobación: {passingScore}%
        </p>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="card p-5">
          <p className="text-xs text-ink-500 mb-2">
            Pregunta {i + 1} · {q.points} {q.points === 1 ? 'punto' : 'puntos'}
          </p>
          <p className="font-medium mb-4 text-ink-900">{q.question_text}</p>

          {q.type === 'single_choice' && (
            <div className="space-y-2">
              {q.options?.map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-md border border-ink-200 hover:bg-mocha-50 has-[:checked]:bg-mocha-50 has-[:checked]:border-mocha-400">
                  <input
                    type="radio" name={q.id} value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
                  />
                  <span className="text-sm">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'multiple_choice' && (
            <div className="space-y-2">
              {q.options?.map((opt) => {
                const selected = (answers[q.id] || []) as string[]
                return (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-md border border-ink-200 hover:bg-mocha-50 has-[:checked]:bg-mocha-50 has-[:checked]:border-mocha-400">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, opt.id]
                          : selected.filter((x) => x !== opt.id)
                        setAnswers({ ...answers, [q.id]: next })
                      }}
                    />
                    <span className="text-sm">{opt.text}</span>
                  </label>
                )
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'true', label: 'Verdadero', icon: CheckCircle2 },
                { value: 'false', label: 'Falso', icon: XCircle },
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-center justify-center gap-2 cursor-pointer p-3 rounded-md border border-ink-200 hover:bg-mocha-50 has-[:checked]:bg-mocha-50 has-[:checked]:border-mocha-400">
                  <input
                    type="radio" name={q.id}
                    checked={answers[q.id] === value}
                    onChange={() => setAnswers({ ...answers, [q.id]: value })}
                    className="sr-only"
                  />
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'short_answer' && (
            <input
              type="text"
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              className="input-base"
              placeholder="Tu respuesta..."
            />
          )}

          {q.type === 'essay' && (
            <div>
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                className="input-base h-32"
                placeholder="Desarrolla tu respuesta..."
              />
              <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Tu instructor revisará esta respuesta manualmente
              </p>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full btn-primary py-3 disabled:opacity-60"
      >
        {submitting ? 'Enviando...' : 'Enviar respuestas'}
      </button>
    </div>
  )
}
