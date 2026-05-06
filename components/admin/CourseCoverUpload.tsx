'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2 } from 'lucide-react'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  courseId?: string
  disabled?: boolean
}

const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function CourseCoverUpload({ value, onChange, courseId, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no válido. Usa JPG, PNG o WebP.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`La imagen es muy grande. Máximo ${MAX_SIZE_MB} MB.`)
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${courseId || crypto.randomUUID()}-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadErr) {
        setError(uploadErr.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName)

      onChange(urlData.publicUrl)
    } catch (e: any) {
      setError(e.message || 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }, [courseId, onChange])

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function removeCover() {
    setError(null)
    onChange(null)
  }

  if (value) {
    return (
      <div>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--a-border)' }}>
          <img
            src={value}
            alt="Portada del curso"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="ccu-overlay-btn"
            >
              <Upload size={12} strokeWidth={2.2} />
              Cambiar
            </button>
            <button
              type="button"
              onClick={removeCover}
              disabled={disabled || uploading}
              className="ccu-overlay-btn ccu-overlay-btn-icon"
              title="Quitar imagen"
            >
              <X size={13} strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={onInputChange} style={{ display: 'none' }} />
        {error && <ErrorMsg msg={error} />}
        <CoverStyles />
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`ccu-dropzone${isDragging ? ' dragging' : ''}${uploading ? ' uploading' : ''}`}
      >
        {uploading ? (
          <>
            <Loader2 size={22} strokeWidth={2} className="ccu-spinner" />
            <span className="ccu-drop-main">Subiendo imagen…</span>
          </>
        ) : (
          <>
            <div className="ccu-drop-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="ccu-drop-text">
              <span className="ccu-drop-main">
                {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para subir'}
              </span>
              <span className="ccu-drop-sub">JPG, PNG o WebP · máx {MAX_SIZE_MB} MB · recomendado 1280×720px</span>
            </div>
            <button type="button" className="ccu-drop-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
              <Upload size={11} strokeWidth={2.5} />
              Seleccionar archivo
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={onInputChange}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {error && <ErrorMsg msg={error} />}
      <CoverStyles />
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      padding: '8px 10px', marginTop: 8,
      background: 'var(--a-warn-50)', border: '1px solid var(--a-warn-200)',
      borderRadius: 6, fontSize: 11, color: 'var(--a-warn)',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{msg}</span>
    </div>
  )
}

function CoverStyles() {
  return (
    <style>{`
      .ccu-dropzone {
        width: 100%; aspect-ratio: 16/9;
        border: 1.5px dashed var(--a-border-2);
        background: var(--a-surface);
        border-radius: 10px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 12px; cursor: pointer;
        transition: background .15s, border-color .15s;
        padding: 24px;
      }
      .ccu-dropzone:hover { background: var(--a-surface-2); border-color: var(--a-brand); }
      .ccu-dropzone.dragging { background: var(--a-surface-2); border-color: var(--a-brand); }
      .ccu-dropzone.uploading { cursor: not-allowed; }
      .ccu-drop-icon {
        width: 48px; height: 48px; border-radius: 10px;
        background: var(--a-bg); border: 1px solid var(--a-border-2);
        display: grid; place-items: center; color: var(--a-brand);
      }
      .ccu-drop-text { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .ccu-drop-main { font-size: 13px; font-weight: 600; color: var(--a-ink); }
      .ccu-drop-sub  { font-size: 11px; color: var(--a-ink-3); }
      .ccu-drop-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 14px;
        background: var(--a-bg); border: 1px solid var(--a-border-2);
        border-radius: 7px; font-family: inherit;
        font-size: 11px; font-weight: 700; color: var(--a-ink-2);
        cursor: pointer; margin-top: 2px;
        transition: background .15s, border-color .15s;
      }
      .ccu-drop-btn:hover { background: var(--a-surface-2); border-color: var(--a-brand); color: var(--a-brand); }
      .ccu-overlay-btn {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 6px 10px;
        background: rgba(20,14,8,0.82); backdrop-filter: blur(4px);
        color: #fff; border: none; border-radius: 6px;
        font-size: 11px; font-weight: 600; cursor: pointer;
        font-family: inherit; transition: background .15s;
      }
      .ccu-overlay-btn:hover { background: rgba(20,14,8,0.95); }
      .ccu-overlay-btn-icon { padding: 6px; }
      .ccu-spinner { color: var(--a-brand); animation: ccu-spin 1s linear infinite; }
      @keyframes ccu-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
    `}</style>
  )
}

/* ─── CourseThumb helper ─── */

export function CourseThumb({
  coverUrl, title, index = 0, size = 44,
}: {
  coverUrl?: string | null
  title: string
  index?: number
  size?: number
}) {
  if (coverUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--a-surface-2)' }}>
        <img src={coverUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )
  }

  const initials = getInitials(title)
  const thumbClass = `course-thumb-${(index % 5) + 1}`
  return (
    <div
      className={thumbClass}
      style={{
        width: size, height: size, borderRadius: 8,
        display: 'grid', placeItems: 'center', flexShrink: 0,
        fontSize: Math.max(12, size * 0.32), fontWeight: 800, letterSpacing: '-0.01em',
      }}
    >
      {initials}
    </div>
  )
}

function getInitials(title: string) {
  const words = title.split(' ').filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return title.slice(0, 2).toUpperCase()
}
