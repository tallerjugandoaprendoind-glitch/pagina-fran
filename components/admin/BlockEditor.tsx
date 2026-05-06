'use client'

/**
 * BlockEditor v4 — formato JSON { id, type, content, meta }
 * Compatible con el blog público (app/blog/[slug]/page.tsx).
 * Incluye: subida de imágenes desde escritorio, alineación, barra de formato.
 */

import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'paragraph' | 'heading1' | 'heading2' | 'heading3'
  | 'quote' | 'callout' | 'bullet' | 'numbered'
  | 'code' | 'divider' | 'image'

export type ImageAlign = 'full' | 'center' | 'left' | 'right'

export interface Block {
  id: string
  type: BlockType
  content: string
  meta?: {
    src?: string
    alt?: string
    caption?: string
    align?: ImageAlign
    emoji?: string
  }
}

export function uid() { return Math.random().toString(36).slice(2, 9) }
export function emptyBlock(type: BlockType = 'paragraph'): Block {
  return { id: uid(), type, content: '', meta: {} }
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

const CATALOG: { type: BlockType; icon: string; label: string; desc: string }[] = [
  { type: 'paragraph', icon: '¶',    label: 'Párrafo',        desc: 'Texto normal' },
  { type: 'heading1',  icon: 'H1',   label: 'Título H1',      desc: 'Encabezado grande' },
  { type: 'heading2',  icon: 'H2',   label: 'Título H2',      desc: 'Sección' },
  { type: 'heading3',  icon: 'H3',   label: 'Subtítulo H3',   desc: 'Subsección' },
  { type: 'image',     icon: '🖼',   label: 'Imagen',         desc: 'Sube o pega URL, alineable' },
  { type: 'quote',     icon: '❝',    label: 'Cita',           desc: 'Blockquote destacado' },
  { type: 'callout',   icon: '💡',   label: 'Cuadro aviso',   desc: 'Nota o llamada' },
  { type: 'bullet',    icon: '•',    label: 'Lista viñeta',   desc: 'Ítem con bullet' },
  { type: 'numbered',  icon: '1.',   label: 'Lista numerada', desc: 'Ítem numerado' },
  { type: 'code',      icon: '</>',  label: 'Código',         desc: 'Bloque monoespaciado' },
  { type: 'divider',   icon: '—',    label: 'Separador',      desc: 'Línea divisoria' },
]

// ── RichTextArea ──────────────────────────────────────────────────────────────

interface RichProps {
  blockId: string
  initialHtml: string
  placeholder?: string
  style?: React.CSSProperties
  onCommit: (html: string) => void
}

function RichTextArea({ blockId, initialHtml, placeholder, style, onCommit }: RichProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastId = useRef('')
  const [focused, setFocused] = useState(false)
  const [empty, setEmpty] = useState(!initialHtml)

  useLayoutEffect(() => {
    if (!ref.current || lastId.current === blockId) return
    ref.current.innerHTML = initialHtml || ''
    lastId.current = blockId
    setEmpty(!initialHtml)
  }, [blockId, initialHtml])

  return (
    <div style={{ position: 'relative' }}>
      {focused && (
        <FormatBar target={ref.current} onFormat={() => ref.current && onCommit(ref.current.innerHTML)} />
      )}
      {empty && !focused && placeholder && (
        <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', color: '#ccc', lineHeight: 1.75, userSelect: 'none', ...style }}>
          {placeholder}
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (ref.current) onCommit(ref.current.innerHTML) }}
        onInput={() => { const v = ref.current?.innerHTML || ''; setEmpty(v === '' || v === '<br>') }}
        style={{ outline: 'none', minHeight: 28, wordBreak: 'break-word', lineHeight: 1.75, ...style }}
      />
    </div>
  )
}

// ── FormatBar ─────────────────────────────────────────────────────────────────

function FormatBar({ target, onFormat }: { target: HTMLElement | null; onFormat: () => void }) {
  const exec = (cmd: string, val?: string) => {
    target?.focus(); document.execCommand(cmd, false, val); onFormat()
  }
  const [linkMode, setLinkMode] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const b: React.CSSProperties = {
    width: 28, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #e0dbd4', borderRadius: 5, background: '#fff',
    color: '#444', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', padding: '4px 6px', marginBottom: 6, background: '#fff', border: '1px solid #e0dbd4', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
      onMouseDown={e => e.preventDefault()}>
      <button type="button" style={b} onClick={() => exec('bold')}><b>B</b></button>
      <button type="button" style={b} onClick={() => exec('italic')}><i>I</i></button>
      <button type="button" style={b} onClick={() => exec('underline')}><u>U</u></button>
      <button type="button" style={b} onClick={() => exec('strikeThrough')}><s>S</s></button>
      <span style={{ width: 1, height: 18, background: '#e0dbd4', margin: '0 2px', flexShrink: 0 }} />
      <button type="button" style={b} onClick={() => exec('justifyLeft')}>⬅</button>
      <button type="button" style={b} onClick={() => exec('justifyCenter')}>⬛</button>
      <button type="button" style={b} onClick={() => exec('justifyRight')}>➡</button>
      <span style={{ width: 1, height: 18, background: '#e0dbd4', margin: '0 2px', flexShrink: 0 }} />
      <select defaultValue="" onChange={e => { if (e.target.value) exec('fontSize', e.target.value); e.target.value = '' }}
        onMouseDown={e => e.stopPropagation()}
        style={{ height: 26, fontSize: 11, border: '1px solid #e0dbd4', borderRadius: 5, background: '#fff', color: '#444', padding: '0 2px', cursor: 'pointer' }}>
        <option value="">Tam.</option>
        <option value="1">Pequeño</option>
        <option value="3">Normal</option>
        <option value="4">Grande</option>
        <option value="5">Muy grande</option>
        <option value="6">Extra</option>
      </select>
      <span style={{ width: 1, height: 18, background: '#e0dbd4', margin: '0 2px', flexShrink: 0 }} />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} title="Color texto">
        <span style={{ fontSize: 11, color: '#888' }}>A</span>
        <input type="color" defaultValue="#1a1a1a" onChange={e => exec('foreColor', e.target.value)}
          style={{ width: 20, height: 20, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} />
      </label>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} title="Resaltar">
        <span style={{ fontSize: 10, color: '#888' }}>BG</span>
        <input type="color" defaultValue="#fff59d" onChange={e => exec('hiliteColor', e.target.value)}
          style={{ width: 20, height: 20, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} />
      </label>
      <span style={{ width: 1, height: 18, background: '#e0dbd4', margin: '0 2px', flexShrink: 0 }} />
      {linkMode ? (
        <>
          <input autoFocus type="url" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { exec('createLink', linkUrl); setLinkMode(false); setLinkUrl('') } if (e.key === 'Escape') setLinkMode(false) }}
            onMouseDown={e => e.stopPropagation()}
            style={{ height: 24, fontSize: 12, border: '1px solid #e0dbd4', borderRadius: 5, padding: '0 6px', width: 150 }} />
          <button type="button" onClick={() => { exec('createLink', linkUrl); setLinkMode(false); setLinkUrl('') }} style={{ ...b, background: '#16a34a', color: '#fff', border: 'none' }}>✓</button>
          <button type="button" onClick={() => setLinkMode(false)} style={b}>✕</button>
        </>
      ) : (
        <>
          <button type="button" style={b} onClick={() => setLinkMode(true)} title="Enlace">🔗</button>
          <button type="button" style={b} onClick={() => exec('unlink')} title="Quitar enlace">✂</button>
        </>
      )}
      <span style={{ width: 1, height: 18, background: '#e0dbd4', margin: '0 2px', flexShrink: 0 }} />
      <button type="button" style={{ ...b, fontSize: 10 }} onClick={() => exec('removeFormat')} title="Limpiar formato">✕fmt</button>
    </div>
  )
}

// ── BlockEditor (principal) ───────────────────────────────────────────────────

interface BlockEditorProps {
  value: Block[]
  onChange: (blocks: Block[]) => void
  postId?: string
}

export function BlockEditor({ value, onChange, postId }: BlockEditorProps) {
  const [blocks, setBlocks_] = useState<Block[]>(() =>
    value && value.length > 0 ? value : [emptyBlock()]
  )
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingBlock = useRef<string | null>(null)
  const supabase = createClient()

  const setBlocks = useCallback((updater: Block[] | ((p: Block[]) => Block[])) => {
    setBlocks_(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      onChange(next)
      return next
    })
  }, [onChange])

  const update = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
  }, [setBlocks])

  const updateMeta = useCallback((id: string, metaPatch: Partial<NonNullable<Block['meta']>>) => {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, meta: { ...b.meta, ...metaPatch } } : b))
  }, [setBlocks])

  const del = useCallback((id: string) => {
    setBlocks(bs => { const n = bs.filter(b => b.id !== id); return n.length ? n : [emptyBlock()] })
  }, [setBlocks])

  const move = useCallback((id: string, dir: -1 | 1) => {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id); const j = i + dir
      if (j < 0 || j >= bs.length) return bs
      const n = [...bs]; [n[i], n[j]] = [n[j], n[i]]; return n
    })
  }, [setBlocks])

  const add = useCallback((afterId: string, type: BlockType) => {
    const nb = emptyBlock(type)
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === afterId)
      const n = [...bs]; n.splice(i + 1, 0, nb); return n
    })
    setMenuOpenId(null)
  }, [setBlocks])

  const triggerUpload = useCallback((blockId: string) => {
    pendingBlock.current = blockId
    if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click() }
  }, [])

  const doUpload = useCallback(async (blockId: string, file: File) => {
    setUploadingId(blockId)
    const ext = file.name.split('.').pop() || 'jpg'
    const name = `blog-${uid()}.${ext}`
    const { error } = await supabase.storage.from('blog-covers').upload(name, file, { contentType: file.type, upsert: true })
    if (error) { alert('Error al subir: ' + error.message); setUploadingId(null); return }
    const { data: { publicUrl } } = supabase.storage.from('blog-covers').getPublicUrl(name)
    updateMeta(blockId, { src: publicUrl })
    setUploadingId(null)
  }, [supabase, updateMeta])

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f && pendingBlock.current) doUpload(pendingBlock.current, f)
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {blocks.map((block, idx) => (
          <BlockRow
            key={block.id}
            block={block} idx={idx} total={blocks.length}
            menuOpenId={menuOpenId} uploadingId={uploadingId}
            onUpdate={update} onUpdateMeta={updateMeta}
            onDelete={del} onMove={move} onAdd={add}
            onToggleMenu={id => setMenuOpenId(menuOpenId === id ? null : id)}
            onCloseMenu={() => setMenuOpenId(null)}
            onUpload={triggerUpload}
          />
        ))}
      </div>

      <button type="button" onClick={() => setMenuOpenId('__end__')}
        style={addEndSt}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#c4783c'; e.currentTarget.style.color = '#c4783c' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = '#bbb' }}>
        + Agregar bloque
      </button>

      {menuOpenId === '__end__' && (
        <div style={{ position: 'relative', zIndex: 30, marginTop: 6 }}>
          <BlockMenu
            onSelect={t => { add(blocks[blocks.length - 1].id, t); setMenuOpenId(null) }}
            onClose={() => setMenuOpenId(null)}
          />
        </div>
      )}
    </div>
  )
}

// ── BlockRow ──────────────────────────────────────────────────────────────────

function BlockRow({ block, idx, total, menuOpenId, uploadingId, onUpdate, onUpdateMeta, onDelete, onMove, onAdd, onToggleMenu, onCloseMenu, onUpload }: {
  block: Block; idx: number; total: number; menuOpenId: string | null; uploadingId: string | null
  onUpdate: (id: string, p: Partial<Block>) => void
  onUpdateMeta: (id: string, m: Partial<NonNullable<Block['meta']>>) => void
  onDelete: (id: string) => void
  onMove: (id: string, d: -1 | 1) => void
  onAdd: (afterId: string, type: BlockType) => void
  onToggleMenu: (id: string) => void
  onCloseMenu: () => void
  onUpload: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const info = CATALOG.find(c => c.type === block.type)

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: 'relative' }}>
      <div style={{ background: '#fff', border: `1px solid ${hovered ? '#ddd7ce' : '#f0ece6'}`, borderRadius: 10, transition: 'border-color .15s' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#faf9f7', borderBottom: '1px solid #f5f2ee', borderRadius: '10px 10px 0 0' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#ccc' }}>
            {info?.icon} {info?.label}
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {idx > 0       && <Ctrl icon="↑" title="Subir"    onClick={() => onMove(block.id, -1)} />}
            {idx < total-1 && <Ctrl icon="↓" title="Bajar"    onClick={() => onMove(block.id, 1)} />}
            <Ctrl icon="🗑" title="Eliminar" onClick={() => onDelete(block.id)} danger />
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: '10px 14px' }}>
          <Content block={block} onUpdate={onUpdate} onUpdateMeta={onUpdateMeta} onUpload={onUpload} uploadingId={uploadingId} />
        </div>
      </div>

      {/* + entre bloques */}
      <div style={{ display: 'flex', justifyContent: 'center', height: 0, zIndex: 5, position: 'relative' }}>
        <button type="button" onClick={() => onToggleMenu(block.id)} title="Agregar bloque aquí"
          style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #c8bfb6', background: '#fff', color: '#999', fontSize: 15, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.1)', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none', transform: hovered ? 'scale(1)' : 'scale(0.7)', transition: 'opacity .15s, transform .15s', marginTop: 3 }}>
          +
        </button>
      </div>

      {menuOpenId === block.id && (
        <div style={{ position: 'relative', zIndex: 30, marginTop: 14 }}>
          <BlockMenu onSelect={t => onAdd(block.id, t)} onClose={onCloseMenu} />
        </div>
      )}
    </div>
  )
}

// ── Content ───────────────────────────────────────────────────────────────────

function Content({ block, onUpdate, onUpdateMeta, onUpload, uploadingId }: {
  block: Block
  onUpdate: (id: string, p: Partial<Block>) => void
  onUpdateMeta: (id: string, m: Partial<NonNullable<Block['meta']>>) => void
  onUpload: (id: string) => void
  uploadingId: string | null
}) {
  const [urlInput, setUrlInput] = useState('')
  const uploading = uploadingId === block.id

  const rte = (placeholder: string, st?: React.CSSProperties) => ({
    blockId: block.id,
    initialHtml: block.content || '',
    placeholder,
    style: st,
    onCommit: (html: string) => onUpdate(block.id, { content: html }),
  })

  if (block.type === 'paragraph')
    return <RichTextArea {...rte('Escribe un párrafo...', { fontFamily: 'Georgia, serif', fontSize: 16 })} />

  if (block.type === 'heading1')
    return <RichTextArea {...rte('Título H1...', { fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: '700', lineHeight: '1.2' })} />

  if (block.type === 'heading2')
    return <RichTextArea {...rte('Título H2...', { fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: '700', lineHeight: '1.25' })} />

  if (block.type === 'heading3')
    return <RichTextArea {...rte('Subtítulo H3...', { fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: '700' })} />

  if (block.type === 'quote')
    return (
      <div style={{ borderLeft: '3px solid #c4783c', paddingLeft: 14 }}>
        <RichTextArea {...rte('Cita destacada...', { fontFamily: 'Georgia, serif', fontSize: 17, fontStyle: 'italic', color: '#555' })} />
      </div>
    )

  if (block.type === 'callout')
    return (
      <div style={{ display: 'flex', gap: 10, background: '#FFF8EC', border: '1.5px solid #F5D78E', borderRadius: 10, padding: '10px 14px' }}>
        <input type="text" value={block.meta?.emoji || '💡'} maxLength={4}
          onChange={e => onUpdateMeta(block.id, { emoji: e.target.value })}
          style={{ width: 34, border: 'none', background: 'transparent', fontSize: '1.2rem', textAlign: 'center', outline: 'none', flexShrink: 0, padding: 0 }} />
        <RichTextArea {...rte('Texto del aviso...', { fontFamily: 'system-ui, sans-serif', fontSize: 15 })} />
      </div>
    )

  if (block.type === 'bullet')
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: '#c4783c', fontSize: 18, lineHeight: 1.75, flexShrink: 0 }}>•</span>
        <RichTextArea {...rte('Ítem de lista...', { fontFamily: 'Georgia, serif', fontSize: 16 })} />
      </div>
    )

  if (block.type === 'numbered')
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: '#c4783c', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui', lineHeight: 1.75, flexShrink: 0, minWidth: 20 }}>•</span>
        <RichTextArea {...rte('Ítem numerado...', { fontFamily: 'Georgia, serif', fontSize: 16 })} />
      </div>
    )

  if (block.type === 'code')
    return (
      <textarea value={block.content} onChange={e => onUpdate(block.id, { content: e.target.value })}
        placeholder="// Código aquí..." rows={Math.max(3, (block.content || '').split('\n').length + 1)}
        style={{ width: '100%', border: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, color: '#d4d4d4', background: '#1e1e1e', outline: 'none', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box' }} />
    )

  if (block.type === 'divider')
    return <hr style={{ border: 'none', borderTop: '2px solid #ebe7e1', margin: '4px 0' }} />

  if (block.type === 'image') {
    const src = block.meta?.src
    const align: ImageAlign = block.meta?.align || 'full'

    const alignBtn = (a: ImageAlign, label: string) => (
      <button type="button" onClick={() => onUpdateMeta(block.id, { align: a })}
        style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, border: `1px solid ${align === a ? '#c4783c' : '#e0dbd4'}`, background: align === a ? '#f5ede3' : '#fff', color: align === a ? '#c4783c' : '#888', borderRadius: 5, cursor: 'pointer' }}>
        {label}
      </button>
    )

    if (src) {
      const wrapSt: React.CSSProperties = {
        width: align === 'full' ? '100%' : align === 'center' ? '70%' : '44%',
        float: align === 'left' ? 'left' : align === 'right' ? 'right' : undefined,
        display: align === 'center' ? 'block' : undefined,
        margin: align === 'center' ? '0 auto' : undefined,
        marginRight: align === 'left' ? 12 : undefined,
        marginLeft: align === 'right' ? 12 : undefined,
        marginBottom: (align === 'left' || align === 'right') ? 8 : undefined,
        position: 'relative',
      }
      return (
        <div>
          <div style={{ overflow: 'hidden', marginBottom: 10 }}>
            <div style={wrapSt}>
              <img src={src} alt={block.meta?.alt || ''} style={{ width: '100%', borderRadius: 8, display: 'block', maxHeight: 380, objectFit: 'cover' }} />
              <button type="button" onClick={() => onUpload(block.id)} style={swapBtn}>
                {uploading ? '⏳' : '🔄 Cambiar imagen'}
              </button>
            </div>
            <div style={{ clear: 'both' }} />
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#bbb', alignSelf: 'center' }}>Posición:</span>
            {alignBtn('left', '⬅ Izquierda')}
            {alignBtn('center', '⬛ Centro')}
            {alignBtn('right', 'Derecha ➡')}
            {alignBtn('full', '↔ Ancho completo')}
          </div>
          <input type="text" placeholder="Pie de foto (opcional)" value={block.meta?.caption || ''}
            onChange={e => onUpdateMeta(block.id, { caption: e.target.value })} style={captionSt} />
        </div>
      )
    }

    return (
      <div>
        <button type="button" onClick={() => onUpload(block.id)} disabled={uploading} style={uploadSt}>
          {uploading
            ? '⏳ Subiendo...'
            : <><span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>🖼</span>Clic para subir imagen desde tu dispositivo</>
          }
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="url" placeholder="...o pega una URL de imagen" value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && urlInput.trim()) { onUpdateMeta(block.id, { src: urlInput.trim() }); setUrlInput('') } }}
            style={{ flex: 1, height: 34, padding: '0 10px', border: '1px solid #e0dbd4', borderRadius: 7, fontSize: 13, outline: 'none' }} />
          <button type="button" onClick={() => { if (urlInput.trim()) { onUpdateMeta(block.id, { src: urlInput.trim() }); setUrlInput('') } }}
            style={{ padding: '0 14px', height: 34, background: '#c4783c', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Usar URL
          </button>
        </div>
        <input type="text" placeholder="Pie de foto (opcional)" value={block.meta?.caption || ''}
          onChange={e => onUpdateMeta(block.id, { caption: e.target.value })} style={{ ...captionSt, marginTop: 8 }} />
      </div>
    )
  }

  return <p style={{ color: '#ccc', fontSize: 12 }}>Tipo: {block.type}</p>
}

// ── BlockMenu ─────────────────────────────────────────────────────────────────

function BlockMenu({ onSelect, onClose }: { onSelect: (t: BlockType) => void; onClose: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 18 }} onClick={onClose} />
      <div style={{ position: 'absolute', left: 0, zIndex: 19, background: '#fff', border: '1.5px solid #ebe7e1', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, width: 360 }}>
        <div style={{ gridColumn: '1/-1', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#bbb', padding: '2px 8px 6px' }}>
          Elegir tipo de bloque
        </div>
        {CATALOG.map(ct => (
          <button key={ct.type} type="button" onClick={() => onSelect(ct.type)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', background: 'transparent', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#faf9f7'; e.currentTarget.style.borderColor = '#ebe7e1' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
            <span style={{ width: 30, height: 30, borderRadius: 7, background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{ct.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: 'system-ui' }}>{ct.label}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#aaa', fontFamily: 'system-ui' }}>{ct.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

// ── Ctrl ──────────────────────────────────────────────────────────────────────

function Ctrl({ icon, title, onClick, danger }: { icon: string; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${danger ? '#fca5a5' : '#e5e1db'}`, background: danger ? '#fef2f2' : '#fff', color: danger ? '#dc2626' : '#666', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </button>
  )
}

// ── Estilos compartidos ───────────────────────────────────────────────────────

const uploadSt: React.CSSProperties = {
  width: '100%', padding: '28px 0',
  border: '2px dashed #d5cfc7', borderRadius: 8,
  background: '#faf9f7', cursor: 'pointer',
  fontSize: 14, fontWeight: 600, color: '#aaa',
  fontFamily: 'system-ui, sans-serif',
  display: 'block', textAlign: 'center', lineHeight: 1.5,
}

const swapBtn: React.CSSProperties = {
  position: 'absolute', bottom: 8, right: 8, padding: '5px 12px',
  background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 7,
  color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
}

const captionSt: React.CSSProperties = {
  display: 'block', width: '100%',
  border: 'none', borderBottom: '1px solid #f0ece6',
  background: 'transparent', padding: '3px 0',
  fontSize: 12, color: '#aaa', fontStyle: 'italic',
  outline: 'none', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
}

const addEndSt: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  marginTop: 10, padding: '10px 0', width: '100%',
  border: '2px dashed rgba(0,0,0,0.12)', borderRadius: 10, background: 'transparent',
  cursor: 'pointer', color: '#bbb', fontSize: 12, fontWeight: 600,
  fontFamily: 'system-ui, sans-serif', transition: 'all .15s',
}
