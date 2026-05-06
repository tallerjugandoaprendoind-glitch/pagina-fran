'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardList, Send, CheckCircle2 } from 'lucide-react'

type Field = {
  id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[]
}

type Props = {
  assignment: {
    id: string; title: string; instructions: string; fields: Field[]
  }
  enrollmentId: string
  existingSubmission?: { answers: any; submitted_at: string; score: number | null; feedback: string | null }
  onSubmitted: (sub: any) => void
}

export default function AssignmentInline({ assignment, enrollmentId, existingSubmission, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>(existingSubmission?.answers || {})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingSubmission)
  const [localSub, setLocalSub] = useState(existingSubmission)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()

    const { data } = await supabase.from('assignment_submissions').upsert({
      assignment_id: assignment.id,
      enrollment_id: enrollmentId,
      answers,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'enrollment_id,assignment_id' }).select().single()

    setSubmitting(false)
    setSubmitted(true)
    if (data) {
      setLocalSub(data as any)
      onSubmitted(data)
    }
  }

  // ─── Ya entregada ───
  if (submitted && localSub) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#E1F5EE', color: '#0F6E56',
          display: 'grid', placeItems: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={36} strokeWidth={2.2} />
        </div>
        <h2 style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em',
          color: '#1F1710', marginBottom: 6,
        }}>
          Tarea enviada
        </h2>
        <p style={{ fontSize: 13, color: '#6B5E4E', marginBottom: 20 }}>
          Tu respuesta fue enviada correctamente.
        </p>

        {localSub.score !== null && localSub.score !== undefined ? (
          <div style={{
            display: 'inline-block',
            padding: 20,
            background: '#F5EFE6',
            border: '1px solid #EDE4D4',
            borderRadius: 12,
            maxWidth: 420,
          }}>
            <div style={{ fontSize: 11, color: '#8A7860', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4 }}>
              CALIFICACIÓN
            </div>
            <div style={{
              fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em',
              color: '#8B6F47', lineHeight: 1,
            }}>
              {localSub.score}%
            </div>
            {localSub.feedback && (
              <div style={{
                marginTop: 16, paddingTop: 14,
                borderTop: '1px solid #EDE4D4',
                fontSize: 13, color: '#3A2D20',
                textAlign: 'left', lineHeight: 1.55,
              }}>
                <strong>Feedback del instructor:</strong><br />
                {localSub.feedback}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: '#F5EFE6',
            borderRadius: 100,
            fontSize: 12, fontWeight: 600,
            color: '#6B5E4E',
          }}>
            Pendiente de revisión del instructor
          </div>
        )}
      </div>
    )
  }

  // ─── Formulario ───
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        background: '#FEF4EE', color: '#C2410C',
        borderRadius: 100,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
        marginBottom: 10,
      }}>
        <ClipboardList size={11} strokeWidth={2.2} />
        ASIGNACIÓN
      </div>
      <h1 style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em',
        color: '#1F1710', marginBottom: 6,
      }}>
        {assignment.title}
      </h1>

      {assignment.instructions && (
        <div style={{
          padding: 14,
          background: '#F5EFE6',
          border: '1px solid #EDE4D4',
          borderRadius: 10,
          fontSize: 13,
          color: '#3A2D20',
          lineHeight: 1.55,
          marginBottom: 20,
          whiteSpace: 'pre-wrap',
        }}>
          {assignment.instructions}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {assignment.fields.map((field) => (
          <div key={field.id} style={{
            padding: 18,
            background: '#FAF7F2',
            border: '1px solid #EDE4D4',
            borderRadius: 10,
          }}>
            <label style={{
              display: 'block',
              fontSize: 13, fontWeight: 600, color: '#1F1710',
              marginBottom: 8,
            }}>
              {field.label}
              {field.required && <span style={{ color: '#C2410C', marginLeft: 4 }}>*</span>}
            </label>

            {field.type === 'short_text' && (
              <input
                type="text" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            )}

            {field.type === 'long_text' && (
              <textarea
                required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                placeholder={field.placeholder}
                rows={4}
                style={{ ...inputStyle, height: 'auto', minHeight: 100, padding: 12 }}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            )}

            {field.type === 'date' && (
              <input
                type="date" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                style={inputStyle}
              />
            )}

            {field.type === 'email' && (
              <input
                type="email" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                placeholder={field.placeholder || 'correo@ejemplo.com'}
                style={inputStyle}
              />
            )}

            {field.type === 'url' && (
              <input
                type="url" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                placeholder={field.placeholder || 'https://'}
                style={inputStyle}
              />
            )}

            {field.type === 'select' && (
              <select
                required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                style={inputStyle}
              >
                <option value="">Selecciona una opción</option>
                {(field.options || []).map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: 12,
            background: '#1F1710', color: '#F4ECDF',
            border: 'none', borderRadius: 100,
            fontSize: 14, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Send size={14} strokeWidth={2.2} />
          {submitting ? 'Enviando…' : 'Enviar tarea'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 38,
  padding: '0 12px',
  background: '#fff',
  border: '1px solid #D9CEB8',
  borderRadius: 8,
  fontSize: 13, color: '#1F1710',
  fontFamily: 'inherit',
}
