'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  Upload, Link2, FileArchive, Plus, Trash2, AlertCircle, Edit2,
  X, Save, ExternalLink, Download,
} from 'lucide-react'

type Resource = {
  id: string
  title: string
  description: string
  resource_type: 'file' | 'link'
  file_url: string | null
  file_name?: string | null
  file_size: number | null
  external_url: string | null
  order: number
}

type Props = {
  courseId: string
  moduleId: string | null   // null = recurso del curso (no de un módulo)
  initialResources: Resource[]
}

export default function ResourcesManager({ courseId, moduleId, initialResources }: Props) {
  const { showToast } = useToast()
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function deleteResource(id: string) {
    if (!confirm('¿Eliminar este recurso?')) return
    const supabase = createClient()
    await supabase.from('course_resources').delete().eq('id', id)
    setResources(resources.filter(r => r.id !== id))
    showToast('Recurso eliminado', 'info')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {resources.map(r => (
        <ResourceRow
          key={r.id}
          resource={r}
          editing={editingId === r.id}
          onEdit={() => setEditingId(r.id)}
          onCancelEdit={() => setEditingId(null)}
          onSaved={(updated) => {
            setResources(resources.map(x => x.id === updated.id ? updated : x))
            setEditingId(null)
          }}
          onDelete={() => deleteResource(r.id)}
        />
      ))}

      {adding ? (
        <AddResourceForm
          courseId={courseId}
          moduleId={moduleId}
          onCancel={() => setAdding(false)}
          onSaved={(r) => {
            setResources([...resources, r])
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
          Agregar recurso
        </button>
      )}
    </div>
  )
}

function ResourceRow({
  resource, editing, onEdit, onCancelEdit, onSaved, onDelete,
}: {
  resource: Resource
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaved: (r: Resource) => void
  onDelete: () => void
}) {
  if (editing) {
    return <EditResourceForm resource={resource} onCancel={onCancelEdit} onSaved={onSaved} />
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
        background: resource.resource_type === 'link' ? '#EEEDFE' : 'var(--a-surface-2)',
        color: resource.resource_type === 'link' ? '#3C3489' : 'var(--a-brand)',
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
      }}>
        {resource.resource_type === 'link'
          ? <Link2 size={14} strokeWidth={2.2} />
          : <FileArchive size={14} strokeWidth={2.2} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--a-ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {resource.title}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--a-ink-3)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {resource.resource_type === 'link'
            ? resource.external_url
            : `${resource.file_name || 'archivo'}${resource.file_size ? ` · ${formatFileSize(resource.file_size)}` : ''}`
          }
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onEdit}
          style={{
            padding: 6, background: 'transparent', border: 'none',
            color: 'var(--a-ink-3)', cursor: 'pointer', borderRadius: 6,
            display: 'grid', placeItems: 'center',
          }}
          title="Editar"
        >
          <Edit2 size={13} strokeWidth={2} />
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: 6, background: 'transparent', border: 'none',
            color: 'var(--a-ink-3)', cursor: 'pointer', borderRadius: 6,
            display: 'grid', placeItems: 'center',
          }}
          title="Eliminar"
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

function AddResourceForm({
  courseId, moduleId, onCancel, onSaved,
}: {
  courseId: string
  moduleId: string | null
  onCancel: () => void
  onSaved: (r: Resource) => void
}) {
  return (
    <ResourceFormBase
      courseId={courseId}
      moduleId={moduleId}
      resource={null}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

function EditResourceForm({
  resource, onCancel, onSaved,
}: {
  resource: Resource
  onCancel: () => void
  onSaved: (r: Resource) => void
}) {
  return (
    <ResourceFormBase
      courseId=""
      moduleId={null}
      resource={resource}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

function ResourceFormBase({
  courseId, moduleId, resource, onCancel, onSaved,
}: {
  courseId: string
  moduleId: string | null
  resource: Resource | null
  onCancel: () => void
  onSaved: (r: Resource) => void
}) {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<'file' | 'link'>(resource?.resource_type || 'file')
  const [title, setTitle] = useState(resource?.title || '')
  const [description, setDescription] = useState(resource?.description || '')
  const [externalUrl, setExternalUrl] = useState(resource?.external_url || '')
  const [fileUrl, setFileUrl] = useState(resource?.file_url || '')
  const [fileName, setFileName] = useState(resource?.file_name || '')
  const [fileSize, setFileSize] = useState(resource?.file_size || 0)

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileUpload(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo es muy grande. Máximo 50 MB.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'bin'
      const safeName = `${crypto.randomUUID()}-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('course-resources')
        .upload(safeName, file, { upsert: true, cacheControl: '3600' })

      if (uploadErr) {
        setError(uploadErr.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('course-resources')
        .getPublicUrl(safeName)

      setFileUrl(urlData.publicUrl)
      setFileName(file.name)
      setFileSize(file.size)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setError(null)
    if (!title.trim()) {
      setError('El título es requerido')
      return
    }
    if (type === 'file' && !fileUrl) {
      setError('Sube un archivo o cambia a "Enlace"')
      return
    }
    if (type === 'link' && !externalUrl.trim()) {
      setError('La URL es requerida')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      resource_type: type,
      external_url: type === 'link' ? externalUrl.trim() : null,
      file_url: type === 'file' ? fileUrl : null,
      file_name: type === 'file' ? fileName : null,
      file_size: type === 'file' ? fileSize : null,
    }

    let data: any
    if (resource) {
      const res = await supabase.from('course_resources')
        .update(payload).eq('id', resource.id).select().single()
      data = res.data
    } else {
      payload.course_id = courseId
      payload.module_id = moduleId
      const res = await supabase.from('course_resources')
        .insert(payload).select().single()
      data = res.data
    }

    setSaving(false)

    if (data) {
      onSaved(data as Resource)
      showToast(resource ? 'Recurso actualizado' : 'Recurso agregado', 'success')
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
      {/* Toggle tipo */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => setType('file')}
          style={{
            flex: 1, padding: '6px 10px',
            background: type === 'file' ? 'var(--a-ink)' : '#fff',
            color: type === 'file' ? 'var(--cream)' : 'var(--a-ink-2)',
            border: '1px solid var(--a-border-2)',
            borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <FileArchive size={12} strokeWidth={2.2} />
          Archivo
        </button>
        <button
          type="button"
          onClick={() => setType('link')}
          style={{
            flex: 1, padding: '6px 10px',
            background: type === 'link' ? 'var(--a-ink)' : '#fff',
            color: type === 'link' ? 'var(--cream)' : 'var(--a-ink-2)',
            border: '1px solid var(--a-border-2)',
            borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <Link2 size={12} strokeWidth={2.2} />
          Enlace externo
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del recurso"
        className="input-base"
        style={{ fontSize: 13 }}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className="input-base"
        style={{ fontSize: 12 }}
      />

      {type === 'link' ? (
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://..."
          className="input-base"
          style={{ fontSize: 12 }}
        />
      ) : (
        <div>
          {fileUrl ? (
            <div style={{
              padding: 10,
              background: '#fff',
              border: '1px solid var(--a-border-2)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <FileArchive size={16} color="var(--a-brand)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--a-ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {fileName || 'archivo'}
                </div>
                {fileSize > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--a-ink-3)' }}>
                    {formatFileSize(fileSize)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setFileUrl(''); setFileName(''); setFileSize(0) }}
                style={{
                  padding: 4, background: 'transparent', border: 'none',
                  color: 'var(--a-ink-3)', cursor: 'pointer', borderRadius: 4,
                  display: 'grid', placeItems: 'center',
                }}
              >
                <X size={13} strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: 14,
                border: '1.5px dashed var(--a-border-2)',
                background: '#fff',
                color: 'var(--a-ink-2)',
                borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Upload size={13} strokeWidth={2.2} />
              {uploading ? 'Subiendo…' : 'Subir archivo (PDF, ZIP, DOCX, etc. · máx 50 MB)'}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileUpload(f)
              e.target.value = ''
            }}
          />
        </div>
      )}

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
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          style={{ fontSize: 11, padding: '6px 12px' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
