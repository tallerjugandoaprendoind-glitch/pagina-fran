'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast, useConfirm } from '@/components/ui/Toast'
import {
  ChevronLeft, Plus, Trash2, AlertCircle, Save,
  Type, AlignLeft, Hash, Calendar, ListChecks, Mail, Link2,
} from 'lucide-react'

type FieldType = 'short_text' | 'long_text' | 'number' | 'date' | 'email' | 'url' | 'select'

type Field = {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  options: string[]
  _existing?: boolean
}

type Props = {
  courseId: string
  courseTitle: string
  initial?: {
    id: string; title: string; instructions: string; due_days: number | null; fields: Field[]
  }
}

const FIELD_TYPES: { value: FieldType; label: string; icon: any }[] = [
  { value: 'short_text', label: 'Texto corto', icon: Type },
  { value: 'long_text', label: 'Texto largo', icon: AlignLeft },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'date', label: 'Fecha', icon: Calendar },
  { value: 'email', label: 'Correo', icon: Mail },
  { value: 'url', label: 'URL / Enlace', icon: Link2 },
  { value: 'select', label: 'Lista desplegable', icon: ListChecks },
]

export default function AssignmentBuilder({ courseId, courseTitle, initial }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const moduleIdFromUrl = searchParams.get('module_id')
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const isEdit = !!initial
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initial?.title || '')
  const [instructions, setInstructions] = useState(initial?.instructions || '')
  const [dueDays, setDueDays] = useState(initial?.due_days ?? 0)
  const [fields, setFields] = useState<Field[]>(
    initial?.fields && initial.fields.length > 0 ? initial.fields : [makeField('short_text')]
  )

  const backUrl = `/admin/courses/${courseId}`

  function makeField(t: FieldType): Field {
    return {
      id: crypto.randomUUID(),
      type: t,
      label: '',
      placeholder: '',
      required: true,
      options: t === 'select' ? ['Opción 1', 'Opción 2'] : [],
    }
  }

  function addField(t: FieldType) {
    setFields([...fields, makeField(t)])
  }

  function removeField(id: string) {
    if (fields.length === 1) return
    setFields(fields.filter(f => f.id !== id))
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields(fields.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    if (!title.trim()) { setError('El título es requerido'); setSaving(false); return }
    for (const f of fields) {
      if (!f.label.trim()) { setError('Todos los campos deben tener una etiqueta'); setSaving(false); return }
    }

    const supabase = createClient()

    if (isEdit) {
      const payload = {
        title, instructions,
        due_days: dueDays || null,
        fields: fields.map(({ _existing, ...f }) => f),
      }
      await supabase.from('assignments').update(payload).eq('id', initial!.id)
    } else {
      const payload = {
        course_id: courseId,
        module_id: moduleIdFromUrl || null,
        title, instructions,
        due_days: dueDays || null,
        fields: fields.map(({ _existing, ...f }) => f),
      }
      await supabase.from('assignments').insert(payload)
    }

    setSaving(false)
    showToast(isEdit ? 'Tarea actualizada' : 'Tarea creada', 'success')
    router.push(backUrl)
    router.refresh()
  }

  async function handleDelete() {
    if (!initial) return
    const ok = await confirm({
      title: '¿Eliminar esta tarea?',
      message: 'Esta acción eliminará la tarea y todas las entregas de los alumnos.',
      danger: true,
      confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    const supabase = createClient()
    await supabase.from('assignments').delete().eq('id', initial.id)
    showToast('Tarea eliminada', 'success')
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
          {isEdit ? 'Editar tarea' : 'Nueva tarea digital'}
        </h1>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Información de la tarea</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm label">Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="input-base" placeholder="Ej: Ejercicio semana 1" />
          </div>
          <div>
            <label className="block text-sm label">Instrucciones</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
              className="input-base min-h-[100px]" placeholder="Describe qué debe hacer el alumno" />
          </div>
          <div>
            <label className="block text-sm label">Plazo de entrega (días)</label>
            <input type="number" min={0} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))}
              className="input-base max-w-xs" placeholder="0 = sin plazo" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Campos a rellenar ({fields.length})</h2>
        </div>

        <div className="space-y-3">
          {fields.map((f, i) => (
            <FieldEditor
              key={f.id}
              field={f}
              index={i}
              onUpdate={(patch) => updateField(f.id, patch)}
              onRemove={() => removeField(f.id)}
              canRemove={fields.length > 1}
            />
          ))}
        </div>

        <div className="mt-6 p-5 bg-mocha-50 rounded-lg border border-mocha-100">
          <p className="text-sm font-medium text-ink-700 mb-3">Agregar campo:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FIELD_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => addField(value)}
                className="flex items-center gap-2 p-2.5 bg-white rounded-md border border-ink-200 hover:border-mocha-400 hover:bg-mocha-50 transition"
              >
                <Icon className="w-4 h-4 text-mocha-600 flex-shrink-0" />
                <span className="text-sm font-medium text-ink-900">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-ink-200 sticky bottom-0 bg-white py-4">
        {isEdit ? (
          <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 rounded-md px-4 py-2 text-sm font-medium">
            Eliminar tarea
          </button>
        ) : <div />}
        <div className="flex gap-3">
          <Link href={backUrl} className="btn-secondary">Cancelar</Link>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Guardando...' : 'Guardar tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldEditor({
  field, index, onUpdate, onRemove, canRemove,
}: {
  field: Field; index: number
  onUpdate: (patch: Partial<Field>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const typeInfo = FIELD_TYPES.find(t => t.value === field.type)!
  const Icon = typeInfo.icon

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-2 flex-shrink-0">
          <div className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-mocha-100 text-mocha-700">
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 font-medium">#{index + 1}</span>
            <span className="text-xs text-mocha-700 font-medium">{typeInfo.label}</span>
            <label className="flex items-center gap-1 ml-auto text-xs text-ink-600">
              <input type="checkbox" checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })} />
              Requerido
            </label>
          </div>

          <input type="text" value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="input-base font-medium"
            placeholder="Etiqueta del campo (ej: Nombre completo)" />

          {field.type !== 'select' && (
            <input type="text" value={field.placeholder}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              className="input-base text-sm"
              placeholder="Placeholder (texto de ayuda, opcional)" />
          )}

          {field.type === 'select' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-ink-600">Opciones:</p>
              {field.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="text" value={opt}
                    onChange={(e) => {
                      const newOpts = [...field.options]
                      newOpts[oi] = e.target.value
                      onUpdate({ options: newOpts })
                    }}
                    className="input-base text-sm flex-1" />
                  {field.options.length > 2 && (
                    <button onClick={() => onUpdate({ options: field.options.filter((_, i) => i !== oi) })}
                      className="p-1.5 text-ink-400 hover:text-red-600 rounded-md">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => onUpdate({ options: [...field.options, `Opción ${field.options.length + 1}`] })}
                className="text-xs text-mocha-700 font-medium hover:text-mocha-800 mt-1">
                + Agregar opción
              </button>
            </div>
          )}
        </div>

        {canRemove && (
          <button onClick={onRemove} className="p-2 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-md flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
