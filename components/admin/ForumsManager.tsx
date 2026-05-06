'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { MessageCircle, Plus, Trash2, Edit2, AlertCircle, Save, X } from 'lucide-react'

type Forum = {
  id: string
  title: string
  description: string
}

type Props = {
  courseId: string
  moduleId: string | null
  initialForums: Forum[]
}

export default function ForumsManager({ courseId, moduleId, initialForums }: Props) {
  const { showToast } = useToast()
  const [forums, setForums] = useState<Forum[]>(initialForums)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function deleteForum(id: string) {
    if (!confirm('¿Eliminar este foro? Se eliminarán todos los mensajes.')) return
    const supabase = createClient()
    await supabase.from('course_forums').delete().eq('id', id)
    setForums(forums.filter(f => f.id !== id))
    showToast('Foro eliminado', 'info')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {forums.map(f => (
        <ForumRow
          key={f.id}
          forum={f}
          editing={editingId === f.id}
          onEdit={() => setEditingId(f.id)}
          onCancelEdit={() => setEditingId(null)}
          onSaved={(updated) => {
            setForums(forums.map(x => x.id === updated.id ? updated : x))
            setEditingId(null)
          }}
          onDelete={() => deleteForum(f.id)}
        />
      ))}

      {adding ? (
        <ForumForm
          courseId={courseId}
          moduleId={moduleId}
          onCancel={() => setAdding(false)}
          onSaved={(f) => {
            setForums([...forums, f])
            setAdding(false)
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 10px',
            border: '1.5px dashed var(--a-border-2)',
            background: 'transparent',
            color: 'var(--a-ink-2)',
            borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={12} strokeWidth={2.2} />
          Agregar foro de discusión
        </button>
      )}
    </div>
  )
}

function ForumRow({
  forum, editing, onEdit, onCancelEdit, onSaved, onDelete,
}: {
  forum: Forum
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaved: (f: Forum) => void
  onDelete: () => void
}) {
  if (editing) {
    return <ForumForm forum={forum} onCancel={onCancelEdit} onSaved={onSaved} />
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: '#fff',
      border: '1px solid var(--a-border)',
      borderRadius: 8,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        background: '#E0F2FE', color: '#0369A1',
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
      }}>
        <MessageCircle size={14} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--a-ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {forum.title}
        </div>
        {forum.description && (
          <div style={{
            fontSize: 11, color: 'var(--a-ink-3)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {forum.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={onEdit} style={iconBtnStyle} title="Editar">
          <Edit2 size={13} strokeWidth={2} />
        </button>
        <button onClick={onDelete} style={iconBtnStyle} title="Eliminar">
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

function ForumForm({
  courseId, moduleId, forum, onCancel, onSaved,
}: {
  courseId?: string
  moduleId?: string | null
  forum?: Forum
  onCancel: () => void
  onSaved: (f: Forum) => void
}) {
  const { showToast } = useToast()
  const [title, setTitle] = useState(forum?.title || '')
  const [description, setDescription] = useState(forum?.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!title.trim()) {
      setError('El título es requerido')
      return
    }

    setSaving(true)
    const supabase = createClient()

    let data: any
    if (forum) {
      const res = await supabase.from('course_forums')
        .update({ title: title.trim(), description: description.trim() })
        .eq('id', forum.id)
        .select().single()
      data = res.data
    } else {
      const res = await supabase.from('course_forums')
        .insert({
          course_id: courseId,
          module_id: moduleId,
          title: title.trim(),
          description: description.trim(),
        })
        .select().single()
      data = res.data
    }

    setSaving(false)

    if (data) {
      onSaved(data as Forum)
      showToast(forum ? 'Foro actualizado' : 'Foro creado', 'success')
    } else {
      setError('Error al guardar')
    }
  }

  return (
    <div style={{
      padding: 14,
      background: 'var(--a-surface)',
      border: '1px solid var(--a-border-2)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del foro (ej: Foro de bienvenida)"
        className="input-base"
        style={{ fontSize: 13 }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Instrucciones iniciales para los alumnos (opcional)"
        rows={3}
        className="input-base"
        style={{ fontSize: 12 }}
      />

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6,
          padding: 8, background: 'var(--a-warn-50)',
          border: '1px solid var(--a-warn-200)',
          borderRadius: 6,
          fontSize: 11, color: 'var(--a-warn)',
        }}>
          <AlertCircle size={11} strokeWidth={2.2} style={{ marginTop: 2, flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button onClick={onCancel} className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}>
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ fontSize: 11, padding: '6px 12px' }}
        >
          <Save size={11} strokeWidth={2.2} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  padding: 6, background: 'transparent', border: 'none',
  color: 'var(--a-ink-3)', cursor: 'pointer', borderRadius: 6,
  display: 'grid', placeItems: 'center',
}
