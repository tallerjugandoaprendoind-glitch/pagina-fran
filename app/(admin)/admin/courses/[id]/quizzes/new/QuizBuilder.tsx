'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  ChevronLeft, Plus, Trash2, AlertCircle, Save,
  CircleDot, CheckSquare, ToggleLeft, Type, FileText,
} from 'lucide-react'

type QType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'

type Option = { id: string; text: string }

type Question = {
  id: string
  type: QType
  question_text: string
  options: Option[]
  correct_answer: any
  points: number
  explanation: string
  _existing?: boolean
}

type Props = {
  courseId: string
  courseTitle: string
  initialQuiz?: {
    id: string; title: string; description: string; type: 'quiz' | 'exam';
    passing_score: number; time_limit_minutes: number | null; max_attempts: number;
  }
  initialQuestions?: Question[]
}

const QUESTION_TYPES: { value: QType; label: string; icon: any; desc: string }[] = [
  { value: 'single_choice', label: 'Opción única', icon: CircleDot, desc: 'Radio buttons, 1 correcta' },
  { value: 'multiple_choice', label: 'Selección múltiple', icon: CheckSquare, desc: 'Checkboxes, varias correctas' },
  { value: 'true_false', label: 'Verdadero / Falso', icon: ToggleLeft, desc: 'Solo V o F' },
  { value: 'short_answer', label: 'Respuesta corta', icon: Type, desc: 'Texto breve, corrección exacta' },
  { value: 'essay', label: 'Desarrollo', icon: FileText, desc: 'Ensayo, revisión manual del admin' },
]

export default function QuizBuilder({ courseId, courseTitle, initialQuiz, initialQuestions }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const moduleIdFromUrl = searchParams.get('module_id')
  const { showToast } = useToast()
  const isEdit = !!initialQuiz
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initialQuiz?.title || '')
  const [description, setDescription] = useState(initialQuiz?.description || '')
  const [type, setType] = useState<'quiz' | 'exam'>(initialQuiz?.type || 'quiz')
  const [passingScore, setPassingScore] = useState(initialQuiz?.passing_score ?? 80)
  const [maxAttempts, setMaxAttempts] = useState(initialQuiz?.max_attempts ?? 3)
  const [timeLimit, setTimeLimit] = useState(initialQuiz?.time_limit_minutes || 0)

  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions && initialQuestions.length > 0 ? initialQuestions : [makeQuestion('single_choice')]
  )
  const [deletedQIds, setDeletedQIds] = useState<string[]>([])

  // A dónde regresar al cerrar/guardar: siempre al editor del curso
  const backUrl = `/admin/courses/${courseId}`

  function makeQuestion(t: QType): Question {
    const base: Question = {
      id: crypto.randomUUID(),
      type: t,
      question_text: '',
      options: [],
      correct_answer: null,
      points: 1,
      explanation: '',
    }
    if (t === 'single_choice') {
      base.options = [
        { id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' },
      ]
      base.correct_answer = 'a'
    } else if (t === 'multiple_choice') {
      base.options = [
        { id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' },
      ]
      base.correct_answer = []
    } else if (t === 'true_false') {
      base.correct_answer = 'true'
    }
    return base
  }

  function addQuestion(t: QType) {
    setQuestions([...questions, makeQuestion(t)])
  }

  function removeQuestion(id: string) {
    const q = questions.find(q => q.id === id)
    if (q?._existing) setDeletedQIds([...deletedQIds, id])
    setQuestions(questions.filter(q => q.id !== id))
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  function addOption(qId: string) {
    const q = questions.find(q => q.id === qId)
    if (!q) return
    const nextId = String.fromCharCode(97 + q.options.length)
    updateQuestion(qId, {
      options: [...q.options, { id: nextId, text: '' }]
    })
  }

  function removeOption(qId: string, optId: string) {
    const q = questions.find(q => q.id === qId)
    if (!q || q.options.length <= 2) return

    const newOpts = q.options.filter(o => o.id !== optId)
    let newCorrect = q.correct_answer
    if (q.type === 'single_choice' && q.correct_answer === optId) {
      newCorrect = newOpts[0]?.id
    } else if (q.type === 'multiple_choice') {
      newCorrect = (q.correct_answer || []).filter((x: string) => x !== optId)
    }
    updateQuestion(qId, { options: newOpts, correct_answer: newCorrect })
  }

  function updateOption(qId: string, optId: string, text: string) {
    const q = questions.find(q => q.id === qId)
    if (!q) return
    updateQuestion(qId, {
      options: q.options.map(o => o.id === optId ? { ...o, text } : o)
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    if (!title.trim()) { setError('El título del examen es requerido'); setSaving(false); return }
    for (const q of questions) {
      if (!q.question_text.trim()) {
        setError('Todas las preguntas deben tener un enunciado')
        setSaving(false)
        return
      }
    }

    const supabase = createClient()

    let quizId = initialQuiz?.id

    if (isEdit) {
      await supabase.from('quizzes').update({
        title, description, type,
        passing_score: passingScore,
        max_attempts: maxAttempts,
        time_limit_minutes: timeLimit || null,
      }).eq('id', quizId!)
    } else {
      const { data: newQuiz, error: qErr } = await supabase.from('quizzes').insert({
        course_id: courseId,
        module_id: moduleIdFromUrl || null,
        title, description, type,
        passing_score: passingScore,
        max_attempts: maxAttempts,
        time_limit_minutes: timeLimit || null,
      }).select().single()

      if (qErr || !newQuiz) {
        setError(qErr?.message || 'Error al crear el examen')
        setSaving(false)
        return
      }
      quizId = newQuiz.id
    }

    if (deletedQIds.length > 0) {
      await supabase.from('questions').delete().in('id', deletedQIds)
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const payload = {
        quiz_id: quizId,
        type: q.type,
        question_text: q.question_text,
        options: (q.type === 'single_choice' || q.type === 'multiple_choice') ? q.options : null,
        correct_answer: q.correct_answer,
        points: q.points,
        order: i,
        explanation: q.explanation || null,
      }

      if (q._existing) {
        await supabase.from('questions').update(payload).eq('id', q.id)
      } else {
        await supabase.from('questions').insert(payload)
      }
    }

    setSaving(false)
    showToast(isEdit ? 'Examen actualizado' : 'Examen creado', 'success')
    router.push(backUrl)
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={backUrl} className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-mocha-700 mb-4">
        <ChevronLeft className="w-4 h-4" />
        Volver al curso
      </Link>

      <div className="mb-6">
        <p className="text-xs text-ink-500 uppercase tracking-wider mb-1">{courseTitle}</p>
        <h1 className="text-3xl lg:text-4xl font-bold text-ink-900">
          {isEdit ? 'Editar examen' : 'Nuevo examen'}
        </h1>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Configuración</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm label">Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="input-base" placeholder="Ej: Examen final del módulo 1" />
          </div>
          <div>
            <label className="block text-sm label">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="input-base" rows={2} placeholder="Instrucciones para el alumno" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm label">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="input-base">
                <option value="quiz">Cuestionario</option>
                <option value="exam">Examen final</option>
              </select>
            </div>
            <div>
              <label className="block text-sm label">Aprobar (%)</label>
              <input type="number" min={0} max={100} value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label className="block text-sm label">Intentos</label>
              <input type="number" min={1} value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label className="block text-sm label">Tiempo (min)</label>
              <input type="number" min={0} value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))} className="input-base" placeholder="0 = sin límite" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Preguntas ({questions.length})</h2>
        </div>

        <div className="space-y-4">
          {questions.map((q, qi) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={qi}
              onUpdate={(patch) => updateQuestion(q.id, patch)}
              onAddOption={() => addOption(q.id)}
              onRemoveOption={(optId) => removeOption(q.id, optId)}
              onUpdateOption={(optId, text) => updateOption(q.id, optId, text)}
              onRemove={() => removeQuestion(q.id)}
              canRemove={questions.length > 1}
            />
          ))}
        </div>

        <div className="mt-6 p-5 bg-mocha-50 rounded-lg border border-mocha-100">
          <p className="text-sm font-medium text-ink-700 mb-3">Agregar pregunta:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {QUESTION_TYPES.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => addQuestion(value)}
                className="flex items-start gap-2 p-3 bg-white rounded-md border border-ink-200 hover:border-mocha-400 hover:bg-mocha-50 transition text-left"
              >
                <Icon className="w-4 h-4 text-mocha-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900">{label}</p>
                  <p className="text-xs text-ink-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-ink-200 sticky bottom-0 bg-white py-4">
        <Link href={backUrl} className="btn-secondary">Cancelar</Link>
        <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? 'Guardando...' : 'Guardar examen'}
        </button>
      </div>
    </div>
  )
}

function QuestionEditor({
  question, index, onUpdate, onAddOption, onRemoveOption, onUpdateOption, onRemove, canRemove,
}: {
  question: Question
  index: number
  onUpdate: (patch: Partial<Question>) => void
  onAddOption: () => void
  onRemoveOption: (optId: string) => void
  onUpdateOption: (optId: string, text: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const typeInfo = QUESTION_TYPES.find(t => t.value === question.type)!
  const Icon = typeInfo.icon

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500 font-medium">Pregunta {index + 1}</span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-mocha-100 text-mocha-800 font-medium">
            <Icon className="w-3 h-3" />
            {typeInfo.label}
          </span>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-md">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <textarea
          value={question.question_text}
          onChange={(e) => onUpdate({ question_text: e.target.value })}
          className="input-base"
          placeholder="Enunciado de la pregunta..."
          rows={2}
        />

        {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-ink-600">Opciones (marca la/las correcta/s):</p>
            {question.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                {question.type === 'single_choice' ? (
                  <input
                    type="radio"
                    checked={question.correct_answer === opt.id}
                    onChange={() => onUpdate({ correct_answer: opt.id })}
                    className="w-4 h-4"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={(question.correct_answer || []).includes(opt.id)}
                    onChange={(e) => {
                      const current = question.correct_answer || []
                      const next = e.target.checked
                        ? [...current, opt.id]
                        : current.filter((x: string) => x !== opt.id)
                      onUpdate({ correct_answer: next })
                    }}
                    className="w-4 h-4"
                  />
                )}
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => onUpdateOption(opt.id, e.target.value)}
                  className="input-base flex-1"
                  placeholder={`Opción ${opt.id.toUpperCase()}`}
                />
                {question.options.length > 2 && (
                  <button onClick={() => onRemoveOption(opt.id)} className="p-2 text-ink-400 hover:text-red-600 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {question.options.length < 6 && (
              <button onClick={onAddOption} className="text-xs text-mocha-700 font-medium hover:text-mocha-800 mt-1">
                + Agregar opción
              </button>
            )}
          </div>
        )}

        {question.type === 'true_false' && (
          <div>
            <p className="text-xs font-medium text-ink-600 mb-2">Respuesta correcta:</p>
            <div className="grid grid-cols-2 gap-2">
              {['true', 'false'].map(v => (
                <label key={v} className="flex items-center justify-center gap-2 cursor-pointer p-3 rounded-md border border-ink-200 hover:bg-mocha-50 has-[:checked]:bg-mocha-50 has-[:checked]:border-mocha-400">
                  <input
                    type="radio"
                    checked={question.correct_answer === v}
                    onChange={() => onUpdate({ correct_answer: v })}
                  />
                  <span className="text-sm font-medium">{v === 'true' ? 'Verdadero' : 'Falso'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {question.type === 'short_answer' && (
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1.5">
              Respuesta esperada (coincidencia exacta, no distingue mayúsculas):
            </label>
            <input
              type="text"
              value={question.correct_answer || ''}
              onChange={(e) => onUpdate({ correct_answer: e.target.value })}
              className="input-base"
              placeholder="Ej: París"
            />
          </div>
        )}

        {question.type === 'essay' && (
          <div className="p-3 bg-ink-50 rounded-md text-xs text-ink-600 flex items-start gap-2">
            <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Esta pregunta requiere <strong>revisión manual</strong>. Aparecerá en el panel de Revisiones cuando un alumno la responda.</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink-100">
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Puntos</label>
            <input type="number" min={1} value={question.points}
              onChange={(e) => onUpdate({ points: Number(e.target.value) })}
              className="input-base text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Explicación (opcional)</label>
            <input type="text" value={question.explanation}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              className="input-base text-sm" placeholder="Se muestra tras responder" />
          </div>
        </div>
      </div>
    </div>
  )
}
