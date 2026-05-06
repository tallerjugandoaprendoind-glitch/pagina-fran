'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2 } from 'lucide-react'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  postId?: string
  disabled?: boolean
}

const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function BlogCoverUpload({ value, onChange, postId, disabled }: Props) {
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
      const fileName = `${postId || crypto.randomUUID()}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('blog-covers')
        .upload(fileName, file, { contentType: file.type, upsert: true, cacheControl: '3600' })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('blog-covers').getPublicUrl(fileName)
      onChange(publicUrl)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }, [postId, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  if (value) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', borderRadius: 10, overflow: 'hidden', background: '#f0f0f0' }}>
        <img src={value} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--a-brand)' : 'var(--a-border)'}`,
          borderRadius: 10, padding: '2rem', textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          background: isDragging ? 'var(--a-surface-2)' : 'var(--a-surface)',
          transition: 'all .2s',
        }}
      >
        {uploading
          ? <><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block', color: 'var(--a-brand)' }} /><p style={{ fontSize: 13, color: 'var(--a-ink-3)', margin: 0 }}>Subiendo...</p></>
          : <><Upload size={22} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--a-ink-3)' }} /><p style={{ fontSize: 13, color: 'var(--a-ink-3)', margin: 0 }}>Arrastra una imagen o <span style={{ color: 'var(--a-brand)', fontWeight: 600 }}>haz clic</span></p><p style={{ fontSize: 11, color: 'var(--a-ink-3)', margin: '4px 0 0', opacity: .7 }}>JPG, PNG o WebP · Máx {MAX_SIZE_MB} MB</p></>
        }
      </div>
      {error && <p style={{ fontSize: 12, color: '#e53e3e', margin: '6px 0 0' }}>{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
    </div>
  )
}
