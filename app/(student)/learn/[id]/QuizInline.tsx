'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, FileText, AlertCircle, RefreshCw } from 'lucide-react'

type Question = {
  id: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  question_text: string
  options?: { id: string; text: string }[]
  points: number
}

type Props = {
  quizId: string
  enrollmentId: string
  existingAttempt?: { score: number; passed: boolean; submitted_at: string }
  onSubmitted: (attempt: any) => void
}

export default function QuizInline({ quizId, enrollmentId, existingAttempt, onSubmitted }: Props) {
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean; needsReview: boolean } | null>(
    existingAttempt ? {
      score: existingAttempt.score,
      passed: existingAttempt.passed,
      needsReview: false,
    } : null
  )
  const [loading, setLoading] = useState(true)
  const [retaking, setRetaking] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const [{ data: q }, { data: qs }] = await Promise.all([
        supabase.from('quizzes').select('id, title, description, type, passing_score, max_attempts, time_limit_minutes').eq('id', quizId).single(),
        supabase.from('questions').select('id, type, question_text, options, points').eq('quiz_id', quizId).order('order'),
      ])
      setQuiz(q)
      setQuestions(qs || [])
      setLoading(false)
    }
    load()
  }, [quizId])

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attempt.id }),
    })
    const data = await res.json()
    setResult(data)
    setSubmitting(false)

    onSubmitted({
      quiz_id: quizId,
      score: data.score,
      passed: data.passed,
      submitted_at: new Date().toISOString(),
    })
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#8A7860' }}>Cargando…</div>
  }

  if (!quiz) {
    return <div style={{ padding: 20, color: '#C2410C' }}>No se pudo cargar el cuestionario.</div>
  }

  // ─── Resultado / ya respondido ───
  if (result && !retaking) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: result.passed ? '#E1F5EE' : '#FEF4EE',
          color: result.passed ? '#0F6E56' : '#C2410C',
          display: 'grid', placeItems: 'center',
          margin: '0 auto 20px',
        }}>
          {result.passed
            ? <CheckCircle2 size={36} strokeWidth={2.2} />
            : <XCircle size={36} strokeWidth={2.2} />
          }
        </div>
        <h2 style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em',
          color: '#1F1710', marginBottom: 4,
        }}>
          {result.needsReview ? 'Enviado para revisión' : result.passed ? '¡Aprobado!' : 'No aprobado'}
        </h2>
        {!result.needsReview && (
          <div style={{
            fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em',
            color: result.passed ? '#0F6E56' : '#C2410C',
            margin: '16px 0',
          }}>
            {result.score.toFixed(1)}%
          </div>
        )}
        {result.needsReview && (
          <p style={{ fontSize: 13, color: '#6B5E4E', margin: '16px auto', maxWidth: 420 }}>
            Tu examen contiene preguntas abiertas que requieren revisión manual.
            Tu instructor las calificará pronto.
          </p>
        )}
        {!result.needsReview && (
          <p style={{ fontSize: 12, color: '#8A7860' }}>
            Nota mínima para aprobar: {quiz.passing_score}%
          </p>
        )}

        {!result.passed && !result.needsReview && (
          <button
            onClick={() => {
              setRetaking(true)
              setAnswers({})
              setResult(null)
            }}
            style={{
              marginTop: 24,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px',
              background: '#1F1710', color: '#F4ECDF',
              border: 'none', borderRadius: 100,
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={13} strokeWidth={2.2} />
            Volver a intentar
          </button>
        )}
      </div>
    )
  }

  // ─── Formulario ───
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: '#F5EFE6', color: '#8B6F47',
          borderRadius: 100,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          marginBottom: 10,
        }}>
          <FileText size={11} strokeWidth={2.2} />
          {quiz.type === 'exam' ? 'EXAMEN' : 'CUESTIONARIO'}
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em',
          color: '#1F1710', marginBottom: 6,
        }}>
          {quiz.title}
        </h1>
        {quiz.description && (
          <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.55, marginBottom: 6 }}>
            {quiz.description}
          </p>
        )}
        <p style={{ fontSize: 12, color: '#8A7860' }}>
          {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'} · Aprobación: {quiz.passing_score}%
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{
            padding: 18,
            background: '#FAF7F2',
            border: '1px solid #EDE4D4',
            borderRadius: 10,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              color: '#8A7860', marginBottom: 6, textTransform: 'uppercase',
            }}>
              Pregunta {i + 1} · {q.points} {q.points === 1 ? 'punto' : 'puntos'}
            </div>
            <p style={{
              fontSize: 14, fontWeight: 600, color: '#1F1710',
              marginBottom: 12, lineHeight: 1.4,
            }}>
              {q.question_text}
            </p>

            {q.type === 'single_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options?.map((opt) => {
                  const selected = answers[q.id] === opt.id
                  return (
                    <label key={opt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      background: selected ? '#F5EFE6' : '#fff',
                      border: `1px solid ${selected ? '#8B6F47' : '#EDE4D4'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background .1s, border-color .1s',
                    }}>
                      <input
                        type="radio" name={q.id} value={opt.id}
                        checked={selected}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
                        style={{ accentColor: '#8B6F47' }}
                      />
                      <span style={{ fontSize: 13, color: '#1F1710' }}>{opt.text}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options?.map((opt) => {
                  const selected = (answers[q.id] || []) as string[]
                  const isSelected = selected.includes(opt.id)
                  return (
                    <label key={opt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      background: isSelected ? '#F5EFE6' : '#fff',
                      border: `1px solid ${isSelected ? '#8B6F47' : '#EDE4D4'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, opt.id]
                            : selected.filter((x) => x !== opt.id)
                          setAnswers({ ...answers, [q.id]: next })
                        }}
                        style={{ accentColor: '#8B6F47' }}
                      />
                      <span style={{ fontSize: 13, color: '#1F1710' }}>{opt.text}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.type === 'true_false' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: 'true', label: 'Verdadero', icon: CheckCircle2 },
                  { value: 'false', label: 'Falso', icon: XCircle },
                ].map(({ value, label, icon: Icon }) => {
                  const selected = answers[q.id] === value
                  return (
                    <label key={value} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '12px 14px',
                      background: selected ? '#F5EFE6' : '#fff',
                      border: `1px solid ${selected ? '#8B6F47' : '#EDE4D4'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio" name={q.id}
                        checked={selected}
                        onChange={() => setAnswers({ ...answers, [q.id]: value })}
                        style={{ display: 'none' }}
                      />
                      <Icon size={15} strokeWidth={2.2} color={selected ? '#8B6F47' : '#8A7860'} />
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: selected ? '#1F1710' : '#3A2D20',
                      }}>
                        {label}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.type === 'short_answer' && (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Tu respuesta…"
                style={{
                  width: '100%', height: 38,
                  padding: '0 12px',
                  background: '#fff',
                  border: '1px solid #D9CEB8',
                  borderRadius: 8,
                  fontSize: 13, color: '#1F1710',
                  fontFamily: 'inherit',
                }}
              />
            )}

            {q.type === 'essay' && (
              <div>
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Desarrolla tu respuesta…"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: 12,
                    background: '#fff',
                    border: '1px solid #D9CEB8',
                    borderRadius: 8,
                    fontSize: 13, color: '#1F1710',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: '#8A7860', marginTop: 6,
                }}>
                  <AlertCircle size={11} strokeWidth={2.2} />
                  Tu instructor revisará esta respuesta manualmente
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={submitting || questions.length === 0}
        style={{
          marginTop: 20,
          width: '100%',
          padding: '12px',
          background: '#1F1710', color: '#F4ECDF',
          border: 'none', borderRadius: 100,
          fontSize: 14, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        {submitting ? 'Enviando…' : 'Enviar respuestas'}
      </button>
    </div>
  )
}
