'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CapyMascot } from '@/components/ui/CapyLogo'
import { Send, CheckCircle2 } from 'lucide-react'

type Field = {
  id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[]
}

type Props = {
  assignmentId: string
  enrollmentId: string
  title: string
  instructions: string
  fields: Field[]
  existingSubmission?: { answers: any; submitted_at: string; score: number | null; feedback: string | null } | null
}

export default function AssignmentForm({
  assignmentId, enrollmentId, title, instructions, fields, existingSubmission,
}: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, any>>(existingSubmission?.answers || {})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingSubmission)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()

    await supabase.from('assignment_submissions').upsert({
      assignment_id: assignmentId,
      enrollment_id: enrollmentId,
      answers,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'enrollment_id,assignment_id' })

    setSubmitting(false)
    setSubmitted(true)
    router.refresh()
  }

  if (submitted && existingSubmission) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="card p-8 text-center">
          <CapyMascot size={140} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            Tarea enviada
          </h2>
          <p className="text-ink-600 mb-4">
            Tu respuesta fue enviada correctamente.
          </p>

          {existingSubmission.score !== null && (
            <div className="inline-block p-4 bg-mocha-50 rounded-lg border border-mocha-200">
              <p className="text-sm text-ink-600">Calificación</p>
              <p className="text-3xl font-bold text-mocha-700">
                {existingSubmission.score}%
              </p>
              {existingSubmission.feedback && (
                <p className="text-sm text-ink-700 mt-3 max-w-md">
                  <strong>Feedback del instructor:</strong> {existingSubmission.feedback}
                </p>
              )}
            </div>
          )}
          {existingSubmission.score === null && (
            <div className="inline-block p-3 bg-ink-50 rounded-lg text-sm text-ink-600">
              Pendiente de revisión del instructor
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">{title}</h1>
      {instructions && (
        <div className="p-4 bg-mocha-50 rounded-lg border border-mocha-100 mb-6">
          <p className="text-sm text-ink-700 whitespace-pre-wrap">{instructions}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map((field) => (
          <div key={field.id} className="card p-5">
            <label className="block text-sm label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.type === 'short_text' && (
              <input type="text" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base" placeholder={field.placeholder} />
            )}

            {field.type === 'long_text' && (
              <textarea required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base min-h-[120px]" placeholder={field.placeholder} />
            )}

            {field.type === 'number' && (
              <input type="number" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base" placeholder={field.placeholder} />
            )}

            {field.type === 'date' && (
              <input type="date" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base" />
            )}

            {field.type === 'email' && (
              <input type="email" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base" placeholder={field.placeholder || 'correo@ejemplo.com'} />
            )}

            {field.type === 'url' && (
              <input type="url" required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base" placeholder={field.placeholder || 'https://'} />
            )}

            {field.type === 'select' && (
              <select required={field.required}
                value={answers[field.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                className="input-base">
                <option value="">Selecciona una opción</option>
                {(field.options || []).map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}

        <button type="submit" disabled={submitting} className="w-full btn-primary py-3 disabled:opacity-60">
          <Send className="w-4 h-4 mr-1.5" />
          {submitting ? 'Enviando...' : 'Enviar tarea'}
        </button>
      </form>
    </div>
  )
}
