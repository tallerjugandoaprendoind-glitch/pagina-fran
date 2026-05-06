'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
}

export function RichTextEditor({ value, onChange, disabled }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isInternalUpdate = useRef(false)
  const savedRange = useRef<Range | null>(null)

  useEffect(() => {
    if (!editorRef.current) return
    if (isInternalUpdate.current) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }, [])

  // Save cursor position before toolbar button click
  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0)
    }
  }, [])

  // Restore cursor position
  const restoreRange = useCallback(() => {
    if (!savedRange.current) return
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
  }, [])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    isInternalUpdate.current = true
    onChange(editorRef.current.innerHTML)
    setTimeout(() => { isInternalUpdate.current = false }, 0)
  }, [onChange])

  // Upload image file → Supabase → insert into editor
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `content-${crypto.randomUUID()}.${ext}`

    // Ensure bucket exists, upload file
    const { error: uploadErr } = await supabase.storage
      .from('blog-covers')
      .upload(fileName, file, { contentType: file.type, upsert: true })

    if (uploadErr) {
      alert('Error al subir imagen: ' + uploadErr.message)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('blog-covers')
      .getPublicUrl(fileName)

    // Restore cursor and insert image
    restoreRange()
    editorRef.current?.focus()
    document.execCommand('insertImage', false, publicUrl)
    handleInput()
  }, [restoreRange, handleInput])

  const handleLink = useCallback(() => {
    restoreRange()
    const url = prompt('URL del enlace:')
    if (url) {
      restoreRange()
      exec('createLink', url)
    }
  }, [exec, restoreRange])

  const btn = (label: string, action: () => void, title?: string) => (
    <button
      type="button"
      title={title || label}
      onMouseDown={saveRange}
      onClick={action}
      style={{
        padding: '4px 8px',
        background: 'none',
        border: '1px solid var(--a-border)',
        borderRadius: 5,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--a-ink-2)',
        lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ border: '1.5px solid var(--a-border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px',
        borderBottom: '1px solid var(--a-border)', background: 'var(--a-surface)',
      }}>
        {btn('B', () => exec('bold'), 'Negrita')}
        {btn('I', () => exec('italic'), 'Cursiva')}
        {btn('U', () => exec('underline'), 'Subrayado')}
        {btn('S̶', () => exec('strikeThrough'), 'Tachado')}
        <div style={{ width: 1, background: 'var(--a-border)', margin: '0 2px' }} />
        {btn('H1', () => exec('formatBlock', '<h1>'), 'Título 1')}
        {btn('H2', () => exec('formatBlock', '<h2>'), 'Título 2')}
        {btn('H3', () => exec('formatBlock', '<h3>'), 'Título 3')}
        {btn('¶', () => exec('formatBlock', '<p>'), 'Párrafo')}
        <div style={{ width: 1, background: 'var(--a-border)', margin: '0 2px' }} />
        {btn('• Lista', () => exec('insertUnorderedList'), 'Lista sin orden')}
        {btn('1. Lista', () => exec('insertOrderedList'), 'Lista numerada')}
        {btn('❝', () => exec('formatBlock', '<blockquote>'), 'Cita')}
        <div style={{ width: 1, background: 'var(--a-border)', margin: '0 2px' }} />
        {btn('🔗 Link', handleLink, 'Insertar enlace')}
        {/* Image: click opens file picker */}
        <button
          type="button"
          title="Insertar imagen"
          onMouseDown={saveRange}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '4px 8px', background: 'none',
            border: '1px solid var(--a-border)', borderRadius: 5,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: 'var(--a-ink-2)', lineHeight: 1.4,
          }}
        >
          🖼 Imagen
        </button>
        <div style={{ width: 1, background: 'var(--a-border)', margin: '0 2px' }} />
        {btn('↩ Deshacer', () => exec('undo'), 'Deshacer')}
        {btn('↪ Rehacer', () => exec('redo'), 'Rehacer')}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleImageUpload(file)
          e.target.value = ''
        }}
      />

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          minHeight: 320, padding: '16px 20px', outline: 'none',
          fontSize: 15, lineHeight: 1.7, color: 'var(--a-ink)',
          opacity: disabled ? 0.6 : 1,
        }}
        className="rich-editor-content"
      />

      <style>{`
        .rich-editor-content h1 { font-size: 1.8rem; font-weight: 800; margin: 1.2rem 0 .6rem; }
        .rich-editor-content h2 { font-size: 1.4rem; font-weight: 700; margin: 1rem 0 .5rem; }
        .rich-editor-content h3 { font-size: 1.15rem; font-weight: 700; margin: .9rem 0 .4rem; }
        .rich-editor-content p { margin: 0 0 .9rem; }
        .rich-editor-content ul { padding-left: 1.4rem; margin: .6rem 0; list-style: disc; }
        .rich-editor-content ol { padding-left: 1.4rem; margin: .6rem 0; list-style: decimal; }
        .rich-editor-content li { margin-bottom: .3rem; }
        .rich-editor-content blockquote { border-left: 3px solid var(--a-brand); padding-left: 1rem; margin: 1rem 0; color: var(--a-ink-2); font-style: italic; }
        .rich-editor-content img { max-width: 100%; border-radius: 8px; margin: .8rem 0; display: block; }
        .rich-editor-content a { color: var(--a-brand); text-decoration: underline; }
        .rich-editor-content strong { font-weight: 700; }
        .rich-editor-content em { font-style: italic; }
      `}</style>
    </div>
  )
}
