'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast, useConfirm } from '@/components/ui/Toast'
import {
  Plus, Trash2, GripVertical, AlertCircle, Save, Trash,
  ChevronDown, PlayCircle, HelpCircle, Pencil,
  ClipboardList, FileArchive, MessageCircle,
  BookOpen, Settings2, Upload, X, Loader2,
} from 'lucide-react'
import { CourseCoverUpload } from '@/components/admin/CourseCoverUpload'
import ResourcesManager from '@/components/admin/ResourcesManager'
import ForumsManager from '@/components/admin/ForumsManager'
import ModuleItemsDnd, { UnifiedItem, ItemType } from '@/components/admin/ModuleItemsDnd'

type Lesson = {
  id: string; title: string; video_url: string; content: string
  duration_minutes: number; order: number; _new?: boolean
}
type Module = {
  id: string; title: string; description: string; order: number
  lessons: Lesson[]; _new?: boolean
}
type QuizItem = {
  id: string; title: string; type: 'quiz' | 'exam'
  passing_score: number; questions_count: number; order: number
}
type AssignmentItem = { id: string; title: string; fields_count: number; order: number }
type ResourceItem = {
  id: string; title: string; description: string; resource_type: 'file' | 'link'
  file_url: string | null; file_name?: string | null; file_size: number | null
  external_url: string | null; order: number
}
type ForumItem = { id: string; title: string; description: string; order: number }
type Course = {
  id: string; title: string; description: string; cover_url: string | null
  passing_score: number; is_published: boolean; modules: Module[]
  intro_title: string | null; intro_video_url: string | null; intro_content: string | null; cert_preview_url: string | null
  quizzesByModule: Record<string, QuizItem[]>; assignmentsByModule: Record<string, AssignmentItem[]>
  resourcesByModule: Record<string, ResourceItem[]>; forumsByModule: Record<string, ForumItem[]>
  courseLevelQuizzes: QuizItem[]; courseLevelAssignments: AssignmentItem[]
  courseLevelResources: ResourceItem[]; courseLevelForums: ForumItem[]
}

function buildUnifiedItems(mod: Module, quizzes: QuizItem[], assignments: AssignmentItem[], resources: ResourceItem[], forums: ForumItem[]): UnifiedItem[] {
  const items: UnifiedItem[] = []
  for (const l of mod.lessons) items.push({ key: `lesson:${l.id}`, type: 'lesson', id: l.id, title: l.title, meta: l.duration_minutes ? `${l.duration_minutes} min` : '', order: l.order })
  for (const q of quizzes) items.push({ key: `quiz:${q.id}`, type: 'quiz', id: q.id, title: q.title, meta: `${q.questions_count} preg. · ${q.passing_score}%`, order: q.order })
  for (const a of assignments) items.push({ key: `assignment:${a.id}`, type: 'assignment', id: a.id, title: a.title, meta: `${a.fields_count} ${a.fields_count === 1 ? 'campo' : 'campos'}`, order: a.order })
  for (const r of resources) items.push({ key: `resource:${r.id}`, type: 'resource', id: r.id, title: r.title, meta: r.resource_type === 'file' ? 'Archivo' : 'Enlace', order: r.order })
  for (const f of forums) items.push({ key: `forum:${f.id}`, type: 'forum', id: f.id, title: f.title, meta: 'Foro', order: f.order })
  return items.sort((a, b) => a.order - b.order)
}

function getItemVisual(type: ItemType) {
  switch (type) {
    case 'lesson':     return { icon: <PlayCircle size={11} strokeWidth={2.2} />,    bg: '#FAEEDA', fg: '#854F0B', label: 'Lección' }
    case 'quiz':       return { icon: <HelpCircle size={11} strokeWidth={2.2} />,    bg: '#E1F5EE', fg: '#0F6E56', label: 'Cuestionario' }
    case 'assignment': return { icon: <ClipboardList size={11} strokeWidth={2.2} />, bg: '#FAECE7', fg: '#993C1D', label: 'Asignación' }
    case 'resource':   return { icon: <FileArchive size={11} strokeWidth={2.2} />,   bg: '#EEEDFE', fg: '#534AB7', label: 'Recurso' }
    case 'forum':      return { icon: <MessageCircle size={11} strokeWidth={2.2} />, bg: '#E6F1FB', fg: '#185FA5', label: 'Foro' }
  }
}

/* ── Micro-components ── */
function NumberBadge({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--a-ink-3)', letterSpacing: '0.06em', background: 'var(--a-surface-2)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{children}</span>
}
function TypeBadge({ bg, fg, icon }: { bg: string; fg: string; icon: React.ReactNode }) {
  return <div style={{ width: 24, height: 24, borderRadius: 6, background: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</div>
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: 'var(--a-ink-3)', background: 'var(--a-surface-2)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600 }}>{children}</span>
}
function DeleteButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} title="Eliminar" style={{ padding: 5, background: 'transparent', border: 'none', color: 'var(--a-ink-3)', cursor: 'pointer', borderRadius: 5, display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'background .1s, color .1s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#B91C1C' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--a-ink-3)' }}>
      <Trash2 size={12} strokeWidth={2} />
    </button>
  )
}
function SectionCard({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(31,23,16,0.04)' }}>{children}</div>
}
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--a-border)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--a-surface-2)', display: 'grid', placeItems: 'center', color: 'var(--a-brand)', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-ink)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--a-ink-3)', marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  )
}
function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="input-label">{label}</label>{children}{hint && <div className="input-help">{hint}</div>}</div>
}
function AddLessonButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '9px', border: '1.5px dashed var(--a-border-2)', background: 'transparent', color: 'var(--a-ink-2)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .1s, border-color .1s, color .1s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 2 }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--a-surface)'; e.currentTarget.style.borderColor = 'var(--a-brand)'; e.currentTarget.style.color = 'var(--a-brand)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--a-border-2)'; e.currentTarget.style.color = 'var(--a-ink-2)' }}>
      <PlayCircle size={12} strokeWidth={2.2} /> + Agregar lección
    </button>
  )
}
function NewModuleNote() {
  return (
    <div style={{ marginTop: 10, background: '#FFFBEB', border: '1px dashed #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
      <AlertCircle size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      Guarda el curso primero para agregar evaluaciones y reordenar elementos.
    </div>
  )
}
function MiniTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? 'var(--a-brand)' : 'transparent'}`, marginBottom: -1, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: active ? 'var(--a-brand)' : 'var(--a-ink-3)', fontFamily: 'inherit', transition: 'color .15s' }}>
      {label}
      {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: active ? 'var(--a-brand)' : 'var(--a-surface-2)', color: active ? '#fff' : 'var(--a-ink-3)', padding: '1px 6px', borderRadius: 100, transition: 'background .15s, color .15s' }}>{count}</span>}
    </button>
  )
}

/* ── LessonCard ── */
function LessonCard({ lesson, numbering, isExpanded, onToggle, canDelete, onDelete, onChange }: {
  lesson: Lesson; numbering: string; isExpanded: boolean
  onToggle: () => void; canDelete: boolean; onDelete: () => void; onChange: (patch: Partial<Lesson>) => void
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${isExpanded ? 'var(--a-brand)' : 'var(--a-border)'}`, borderRadius: 9, overflow: 'hidden', transition: 'border-color .15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', cursor: 'pointer', background: isExpanded ? 'var(--a-surface)' : 'transparent' }} onClick={onToggle}>
        <NumberBadge>{numbering}</NumberBadge>
        <TypeBadge bg="#FAEEDA" fg="#854F0B" icon={<PlayCircle size={11} strokeWidth={2.2} />} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lesson.title || <span style={{ color: 'var(--a-ink-3)', fontStyle: 'italic' }}>Sin título</span>}
        </span>
        <Tag>Lección</Tag>
        {lesson.duration_minutes > 0 && <span style={{ fontSize: 11, color: 'var(--a-ink-3)', whiteSpace: 'nowrap' }}>{lesson.duration_minutes} min</span>}
        <ChevronDown size={14} color="var(--a-ink-3)" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s', flexShrink: 0 }} />
        {canDelete && <DeleteButton onClick={e => { e.stopPropagation(); onDelete() }} />}
      </div>
      {isExpanded && (
        <div style={{ padding: '14px', borderTop: '1px solid var(--a-border)', display: 'grid', gap: 10 }}>
          <FieldGroup label="Título de la lección">
            <input type="text" value={lesson.title} onChange={e => onChange({ title: e.target.value })} placeholder="Título de la lección" className="input-base" style={{ height: 32, fontSize: 13 }} />
          </FieldGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }} className="lesson-grid">
            <FieldGroup label="URL del video (YouTube o Vimeo)">
              <input type="url" value={lesson.video_url} onChange={e => onChange({ video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="input-base" style={{ height: 32, fontSize: 12 }} />
            </FieldGroup>
            <FieldGroup label="Duración (min)">
              <input type="number" min={1} value={lesson.duration_minutes} onChange={e => onChange({ duration_minutes: Number(e.target.value) })} className="input-base" style={{ height: 32, fontSize: 12 }} />
            </FieldGroup>
          </div>
          <FieldGroup label="Notas / contenido">
            <textarea value={lesson.content} onChange={e => onChange({ content: e.target.value })} rows={2} placeholder="Texto complementario, enlaces, notas…" className="input-base" style={{ fontSize: 12, resize: 'none' }} />
          </FieldGroup>
        </div>
      )}
    </div>
  )
}

/* ── NonLessonItemCard ── */
function NonLessonItemCard({ item, numbering, courseId }: { item: UnifiedItem; numbering: string; courseId: string }) {
  const visual = getItemVisual(item.type)
  const editHref = item.type === 'quiz' ? `/admin/courses/${courseId}/quizzes/${item.id}` : item.type === 'assignment' ? `/admin/courses/${courseId}/assignments/${item.id}` : null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--a-border)', borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9 }}>
      <NumberBadge>{numbering}</NumberBadge>
      <TypeBadge bg={visual.bg} fg={visual.fg} icon={visual.icon} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || 'Sin título'}</div>
        <div style={{ fontSize: 11, color: 'var(--a-ink-3)', marginTop: 1 }}>{visual.label}{item.meta ? ` · ${item.meta}` : ''}</div>
      </div>
      {editHref && (
        <Link href={editHref} style={{ display: 'grid', placeItems: 'center', padding: 6, borderRadius: 6, color: 'var(--a-ink-3)', border: '1px solid var(--a-border)', background: 'var(--a-surface)' }} title="Editar">
          <Pencil size={12} strokeWidth={2} />
        </Link>
      )}
    </div>
  )
}

/* ── EvaluationItem ── */
function EvaluationItem({ courseId, type, item }: { courseId: string; type: 'quiz' | 'assignment'; item: QuizItem | AssignmentItem }) {
  const editHref = type === 'quiz' ? `/admin/courses/${courseId}/quizzes/${item.id}` : `/admin/courses/${courseId}/assignments/${item.id}`
  const isQuiz = type === 'quiz'
  const subtitle = isQuiz ? `${(item as QuizItem).questions_count} preguntas · aprobar con ${(item as QuizItem).passing_score}%` : `${(item as AssignmentItem).fields_count} ${(item as AssignmentItem).fields_count === 1 ? 'campo' : 'campos'} por completar`
  return (
    <Link href={editHref} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#fff', border: '1px solid var(--a-border)', borderRadius: 9, textDecoration: 'none', color: 'inherit', transition: 'background .1s, border-color .1s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--a-surface)'; e.currentTarget.style.borderColor = 'var(--a-border-2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--a-border)' }}>
      <TypeBadge bg={isQuiz ? '#E1F5EE' : '#FAECE7'} fg={isQuiz ? '#0F6E56' : '#993C1D'} icon={isQuiz ? <HelpCircle size={13} strokeWidth={2.2} /> : <ClipboardList size={13} strokeWidth={2.2} />} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || 'Sin título'}</span>
          {isQuiz && <Tag>{(item as QuizItem).type === 'exam' ? 'EXAMEN' : 'QUIZ'}</Tag>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--a-ink-3)', marginTop: 1 }}>{subtitle}</div>
      </div>
      <Pencil size={13} strokeWidth={2} color="var(--a-ink-3)" />
    </Link>
  )
}

/* ── ReorderPanel ── */
function ReorderPanel({ moduleIndex, moduleId, unifiedItems, onReordered }: { moduleIndex: number; moduleId: string; unifiedItems: UnifiedItem[]; onReordered: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: 'var(--a-ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '4px 0', userSelect: 'none' }}>
        <GripVertical size={12} strokeWidth={2.2} color="var(--a-brand)" /> Reordenar elementos
        <ChevronDown size={12} strokeWidth={2.2} style={{ color: 'var(--a-ink-3)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }} />
      </button>
      {open && <div style={{ marginTop: 10 }}><ModuleItemsDnd moduleIndex={moduleIndex} moduleId={moduleId} initialItems={unifiedItems} onReordered={onReordered} /></div>}
    </div>
  )
}

/* ── CertImageUpload ── */
function CertImageUpload({ value, onChange, courseId }: { value: string; onChange: (v: string) => void; courseId: string }) {
  const [mode, setMode] = useState<'upload' | 'url'>(!value || value.startsWith('http') ? (value && !value.includes('supabase') ? 'url' : 'upload') : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setUploadError('Solo JPG, PNG o WebP'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Máximo 5 MB'); return }
    setUploadError(null); setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `cert-${courseId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('course-covers').upload(fileName, file, { contentType: file.type, upsert: true })
      if (upErr) { setUploadError(upErr.message); return }
      const { data: urlData } = supabase.storage.from('course-covers').getPublicUrl(fileName)
      onChange(urlData.publicUrl)
    } catch (e: any) {
      setUploadError(e.message || 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 10, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {(['upload', 'url'] as const).map(m => (
          <button key={m} type="button" onClick={() => { setMode(m); setUploadError(null) }} style={{ padding: '5px 14px', background: mode === m ? '#fff' : 'transparent', border: mode === m ? '1px solid var(--a-border)' : '1px solid transparent', borderRadius: 6, fontSize: 12, fontWeight: 600, color: mode === m ? 'var(--a-ink)' : 'var(--a-ink-3)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
            {m === 'upload' ? 'Subir imagen' : 'Pegar URL'}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div>
          {value ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8 }}>
              <img src={value} alt="Certificado" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--a-border)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink)', marginBottom: 6 }}>Imagen subida</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--a-bg)', border: '1px solid var(--a-border-2)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--a-ink-2)' }}>
                    <Upload size={11} strokeWidth={2.5} /> Cambiar
                  </button>
                  <button type="button" onClick={() => onChange('')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#B91C1C' }}>
                    <X size={11} strokeWidth={2.5} /> Quitar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div onClick={() => !uploading && fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 16px', border: '1.5px dashed var(--a-border-2)', borderRadius: 8, background: 'var(--a-surface)', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'background .15s, border-color .15s' }}
              onMouseEnter={e => { if (!uploading) { e.currentTarget.style.background = 'var(--a-surface-2)'; e.currentTarget.style.borderColor = 'var(--a-brand)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--a-surface)'; e.currentTarget.style.borderColor = 'var(--a-border-2)' }}>
              {uploading ? (
                <><Loader2 size={18} style={{ color: 'var(--a-brand)', animation: 'ccu-spin 1s linear infinite' }} /><span style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>Subiendo…</span></>
              ) : (
                <><Upload size={18} style={{ color: 'var(--a-ink-3)' }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink-2)' }}>Haz clic para subir una imagen</span><span style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>JPG, PNG o WebP · máx 5 MB</span></>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </div>
      ) : (
        <div>
          <input type="url" value={value} onChange={e => onChange(e.target.value)} className="input-base" placeholder="https://... (imagen JPG, PNG o WebP)" />
          {value && (
            <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--a-border)', maxWidth: 320 }}>
              <img src={value} alt="Vista previa del certificado" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', marginTop: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: 11, color: '#B91C1C' }}>
          <AlertCircle size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />{uploadError}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════ */

export default function CourseEditor({ course }: { course: Course }) {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content')

  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description)
  const [coverUrl, setCoverUrl] = useState<string | null>(course.cover_url)
  const [passingScore, setPassingScore] = useState(course.passing_score)
  const [isPublished, setIsPublished] = useState(course.is_published)
  const [introTitle, setIntroTitle] = useState(course.intro_title || '')
  const [introVideoUrl, setIntroVideoUrl] = useState(course.intro_video_url || '')
  const [introContent, setIntroContent] = useState(course.intro_content || '')
  const [certPreviewUrl, setCertPreviewUrl] = useState(course.cert_preview_url || '')

  const [modules, setModules] = useState<Module[]>(course.modules)
  const [deletedModuleIds, setDeletedModuleIds] = useState<string[]>([])
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([])
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [moduleTabState, setModuleTabState] = useState<Record<string, string>>({})

  const quizzesByModule = course.quizzesByModule
  const assignmentsByModule = course.assignmentsByModule
  const resourcesByModule = course.resourcesByModule || {}
  const forumsByModule = course.forumsByModule || {}

  function getModTab(id: string) { return (moduleTabState[id] || 'content') as 'content' | 'resources' | 'forums' }
  function setModTab(id: string, tab: string) { setModuleTabState(p => ({ ...p, [id]: tab })) }

  function toggleModule(id: string) {
    const s = new Set(collapsedModules); s.has(id) ? s.delete(id) : s.add(id); setCollapsedModules(s)
  }
  function addModule() {
    setModules([...modules, { id: crypto.randomUUID(), title: `Módulo ${modules.length + 1}`, description: '', order: modules.length, lessons: [{ id: crypto.randomUUID(), title: '', video_url: '', content: '', duration_minutes: 10, order: 0, _new: true }], _new: true }])
  }
  function removeModule(id: string) {
    if (modules.length === 1) return
    const mod = modules.find(m => m.id === id)
    if (mod && !mod._new) setDeletedModuleIds([...deletedModuleIds, id])
    setModules(modules.filter(m => m.id !== id))
  }
  function updateModule(id: string, patch: Partial<Module>) { setModules(modules.map(m => m.id === id ? { ...m, ...patch } : m)) }
  function addLesson(moduleId: string) {
    setModules(modules.map(m => {
      if (m.id !== moduleId) return m
      const allOrders = [...m.lessons.map(l => l.order), ...(quizzesByModule[m.id] || []).map(q => q.order), ...(assignmentsByModule[m.id] || []).map(a => a.order), ...(resourcesByModule[m.id] || []).map(r => r.order), ...(forumsByModule[m.id] || []).map(f => f.order)]
      const maxOrder = allOrders.length > 0 ? Math.max(...allOrders) : -1
      return { ...m, lessons: [...m.lessons, { id: crypto.randomUUID(), title: '', video_url: '', content: '', duration_minutes: 10, order: maxOrder + 1, _new: true }] }
    }))
  }
  function removeLesson(moduleId: string, lessonId: string) {
    const mod = modules.find(m => m.id === moduleId)
    if (!mod || mod.lessons.length === 1) return
    const lesson = mod.lessons.find(l => l.id === lessonId)
    if (lesson && !lesson._new) setDeletedLessonIds([...deletedLessonIds, lessonId])
    setModules(modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m))
    if (expandedLesson === lessonId) setExpandedLesson(null)
  }
  function updateLesson(moduleId: string, lessonId: string, patch: Partial<Lesson>) {
    setModules(modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...patch } : l) } : m))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    if (!title.trim()) { setError('El título es requerido'); setSaving(false); return }
    const supabase = createClient()
    const { error: courseErr } = await supabase.from('courses').update({ title, description, cover_url: coverUrl, passing_score: passingScore, is_published: isPublished, intro_title: introTitle || null, intro_video_url: introVideoUrl || null, intro_content: introContent || null, cert_preview_url: certPreviewUrl || null, updated_at: new Date().toISOString() }).eq('id', course.id)
    if (courseErr) { setError(courseErr.message); setSaving(false); return }
    if (deletedModuleIds.length > 0) await supabase.from('modules').delete().in('id', deletedModuleIds)
    if (deletedLessonIds.length > 0) await supabase.from('lessons').delete().in('id', deletedLessonIds)
    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi]
      if (mod._new) {
        const { data: newMod } = await supabase.from('modules').insert({ course_id: course.id, title: mod.title, description: mod.description, order: mi }).select().single()
        if (newMod) {
          const toInsert = mod.lessons.map((l, li) => ({ module_id: newMod.id, title: l.title, video_url: l.video_url, content: l.content, duration_minutes: l.duration_minutes, order: l.order ?? li }))
          if (toInsert.length > 0) await supabase.from('lessons').insert(toInsert)
        }
      } else {
        await supabase.from('modules').update({ title: mod.title, description: mod.description, order: mi }).eq('id', mod.id)
        for (const lesson of mod.lessons) {
          if (lesson._new) await supabase.from('lessons').insert({ module_id: mod.id, title: lesson.title, video_url: lesson.video_url, content: lesson.content, duration_minutes: lesson.duration_minutes, order: lesson.order })
          else await supabase.from('lessons').update({ title: lesson.title, video_url: lesson.video_url, content: lesson.content, duration_minutes: lesson.duration_minutes, order: lesson.order }).eq('id', lesson.id)
        }
      }
    }
    setDeletedModuleIds([]); setDeletedLessonIds([]); setSaving(false)
    showToast('Cambios guardados correctamente', 'success'); router.refresh()
  }

  async function handleDelete() {
    const ok = await confirm({ title: '¿Eliminar este curso?', message: 'Esta acción no se puede deshacer. Se eliminarán todos los módulos, lecciones, evaluaciones y el progreso de los alumnos.', danger: true, confirmText: 'Sí, eliminar' })
    if (!ok) return; setDeleting(true)
    const supabase = createClient(); await supabase.from('courses').delete().eq('id', course.id)
    showToast('Curso eliminado', 'success'); router.push('/admin'); router.refresh()
  }

  const topTabs = [
    { id: 'content' as const,  label: 'Contenido',     icon: <BookOpen size={14} strokeWidth={2.2} /> },
    { id: 'settings' as const, label: 'Configuración', icon: <Settings2 size={14} strokeWidth={2.2} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#B91C1C' }}>
          <AlertCircle size={15} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Top Tabs ── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--a-border)' }}>
        {topTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--a-brand)' : 'transparent'}`, marginBottom: -1, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: activeTab === tab.id ? 'var(--a-brand)' : 'var(--a-ink-3)', fontFamily: 'inherit', transition: 'color .15s' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB CONFIGURACIÓN ══ */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard>
            <SectionHeader icon={<BookOpen size={15} strokeWidth={2.2} />} title="Imagen de portada" />
            <div style={{ padding: '16px 20px 20px' }}><CourseCoverUpload value={coverUrl} onChange={setCoverUrl} courseId={course.id} /></div>
          </SectionCard>
          <SectionCard>
            <SectionHeader icon={<BookOpen size={15} strokeWidth={2.2} />} title="Información básica" />
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FieldGroup label="Título del curso *">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-base" placeholder="Ej: Introducción al análisis del comportamiento" />
              </FieldGroup>
              <FieldGroup label="Descripción">
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-base" rows={3} placeholder="¿De qué trata el curso? ¿Qué aprenderá el alumno?" />
              </FieldGroup>
            </div>
          </SectionCard>
          <SectionCard>
            <SectionHeader
              icon={<PlayCircle size={15} strokeWidth={2.2} />}
              title="Titular / Intro gratuita"
              subtitle="Esta sección es la única parte visible para alumnos sin acceso al curso"
            />
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#FFFBEB', border: '1px dashed #FCD34D', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
                <AlertCircle size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                Los alumnos sin inscripción verán solo esta intro y un botón de WhatsApp para solicitar acceso.
              </div>
              <FieldGroup label="Título del titular">
                <input
                  type="text"
                  value={introTitle}
                  onChange={e => setIntroTitle(e.target.value)}
                  className="input-base"
                  placeholder="Ej: ¿Por qué estudiar este curso?"
                />
              </FieldGroup>
              <FieldGroup label="Video introductorio (URL de YouTube o Vimeo)" hint="Opcional. Se muestra como preview gratuita.">
                <input
                  type="url"
                  value={introVideoUrl}
                  onChange={e => setIntroVideoUrl(e.target.value)}
                  className="input-base"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </FieldGroup>
              <FieldGroup label="Texto de presentación" hint="Describe brevemente qué aprenderá el alumno.">
                <textarea
                  value={introContent}
                  onChange={e => setIntroContent(e.target.value)}
                  className="input-base"
                  rows={4}
                  placeholder="Ej: En este curso aprenderás los fundamentos del análisis del comportamiento aplicado…"
                />
              </FieldGroup>
              <FieldGroup label="Imagen del modelo de certificado" hint="Se muestra en la página pública del curso.">
                <CertImageUpload value={certPreviewUrl} onChange={setCertPreviewUrl} courseId={course.id} />
              </FieldGroup>
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeader icon={<Settings2 size={15} strokeWidth={2.2} />} title="Opciones del curso" />
            <div style={{ padding: '16px 20px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="info-grid">
                <FieldGroup label="Nota mínima para aprobar (%)" hint="Entre 50 y 100. Por defecto 80%.">
                  <input type="number" min={50} max={100} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="input-base" />
                </FieldGroup>
                <FieldGroup label="Estado de publicación">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 12px', background: isPublished ? '#F0FDF4' : 'var(--a-surface)', border: '1px solid', borderRadius: 8, cursor: 'pointer', borderColor: isPublished ? '#86EFAC' : 'var(--a-border-2)', transition: 'background .15s, border-color .15s' }}>
                    <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} style={{ accentColor: '#059669' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: isPublished ? '#059669' : 'var(--a-ink-2)' }}>{isPublished ? '✓ Publicado y visible' : 'Borrador (solo tú lo ves)'}</span>
                  </label>
                </FieldGroup>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══ TAB CONTENIDO ══ */}
      {activeTab === 'content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header módulos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--a-ink)', margin: 0 }}>Módulos del curso</h2>
              <p style={{ fontSize: 12, color: 'var(--a-ink-3)', marginTop: 3, marginBottom: 0 }}>{modules.length} {modules.length === 1 ? 'módulo' : 'módulos'} · Arrastra para reordenar</p>
            </div>
            <button onClick={addModule} className="btn-secondary" style={{ gap: 6 }}><Plus size={14} strokeWidth={2.5} />Agregar módulo</button>
          </div>

          {/* Módulos */}
          {modules.map((mod, mi) => {
            const collapsed = collapsedModules.has(mod.id)
            const modQuizzes     = (!mod._new && quizzesByModule[mod.id])     || []
            const modAssignments = (!mod._new && assignmentsByModule[mod.id]) || []
            const modResources   = (!mod._new && resourcesByModule[mod.id])   || []
            const modForums      = (!mod._new && forumsByModule[mod.id])      || []
            const totalItems = mod.lessons.length + modQuizzes.length + modAssignments.length + modResources.length + modForums.length
            const unifiedItems = buildUnifiedItems(mod, modQuizzes, modAssignments, modResources, modForums)
            const currentModTab = getModTab(mod.id)

            return (
              <div key={mod.id} style={{ background: '#fff', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(31,23,16,0.04)' }}>

                {/* Cabecera del módulo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--a-surface)', borderBottom: collapsed ? 'none' : '1px solid var(--a-border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--a-brand)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{mi + 1}</div>
                  <GripVertical size={14} color="var(--a-ink-4)" style={{ cursor: 'grab', flexShrink: 0 }} />
                  <input type="text" value={mod.title} onChange={e => updateModule(mod.id, { title: e.target.value })} placeholder="Título del módulo" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--a-ink)', fontFamily: 'inherit', padding: 0, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--a-ink-3)', background: 'var(--a-surface-2)', padding: '3px 9px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0 }}>{totalItems} {totalItems === 1 ? 'elemento' : 'elementos'}</span>
                  {modules.length > 1 && (
                    <button onClick={() => removeModule(mod.id)} title="Eliminar módulo" style={{ padding: 6, background: 'transparent', border: 'none', color: 'var(--a-ink-3)', cursor: 'pointer', borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'background .1s, color .1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#B91C1C' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--a-ink-3)' }}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                  <button onClick={() => toggleModule(mod.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, color: 'var(--a-ink-3)', borderRadius: 5, flexShrink: 0 }}>
                    <ChevronDown size={16} strokeWidth={2.2} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
                  </button>
                </div>

                {!collapsed && (
                  <div>
                    {/* Descripción del módulo */}
                    <div style={{ padding: '14px 18px 0' }}>
                      <textarea value={mod.description} onChange={e => updateModule(mod.id, { description: e.target.value })} placeholder="Descripción breve del módulo (opcional)" rows={2} className="input-base" style={{ fontSize: 12, resize: 'none' }} />
                    </div>

                    {/* Sub-tabs solo si módulo guardado */}
                    {!mod._new && (
                      <div style={{ display: 'flex', gap: 0, padding: '12px 18px 0', borderBottom: '1px solid var(--a-border)' }}>
                        <MiniTab label="Contenido" count={mod.lessons.length + modQuizzes.length + modAssignments.length} active={currentModTab === 'content'} onClick={() => setModTab(mod.id, 'content')} />
                        <MiniTab label="Recursos" count={modResources.length} active={currentModTab === 'resources'} onClick={() => setModTab(mod.id, 'resources')} />
                        <MiniTab label="Foros" count={modForums.length} active={currentModTab === 'forums'} onClick={() => setModTab(mod.id, 'forums')} />
                      </div>
                    )}

                    {/* TAB: Contenido */}
                    {(mod._new || currentModTab === 'content') && (
                      <div style={{ padding: '16px 18px 18px' }}>
                        {mod._new ? (
                          <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                              {mod.lessons.map((lesson, li) => (
                                <LessonCard key={lesson.id} lesson={lesson} numbering={`${mi + 1}.${li + 1}`} isExpanded={expandedLesson === lesson.id} onToggle={() => setExpandedLesson(prev => prev === lesson.id ? null : lesson.id)} canDelete={mod.lessons.length > 1} onDelete={() => removeLesson(mod.id, lesson.id)} onChange={patch => updateLesson(mod.id, lesson.id, patch)} />
                              ))}
                            </div>
                            <AddLessonButton onClick={() => addLesson(mod.id)} />
                            <NewModuleNote />
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                              {unifiedItems.map((item, idx) => {
                                if (item.type === 'lesson') {
                                  const lesson = mod.lessons.find(l => l.id === item.id)
                                  if (!lesson) return null
                                  return <LessonCard key={item.key} lesson={lesson} numbering={`${mi + 1}.${idx + 1}`} isExpanded={expandedLesson === lesson.id} onToggle={() => setExpandedLesson(prev => prev === lesson.id ? null : lesson.id)} canDelete={mod.lessons.length > 1} onDelete={() => removeLesson(mod.id, lesson.id)} onChange={patch => updateLesson(mod.id, lesson.id, patch)} />
                                }
                                return <NonLessonItemCard key={item.key} item={item} numbering={`${mi + 1}.${idx + 1}`} courseId={course.id} />
                              })}
                            </div>
                            <AddLessonButton onClick={() => addLesson(mod.id)} />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 12, borderTop: '1px dashed var(--a-border)' }}>
                              <span style={{ fontSize: 11, color: 'var(--a-ink-3)', alignSelf: 'center', marginRight: 2 }}>Agregar:</span>
                              <Link href={`/admin/courses/${course.id}/quizzes/new?module_id=${mod.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: 'none', background: '#E1F5EE', color: '#0F6E56', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <HelpCircle size={12} strokeWidth={2.2} /> Evaluación
                              </Link>
                              <Link href={`/admin/courses/${course.id}/assignments/new?module_id=${mod.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: 'none', background: '#FAECE7', color: '#993C1D', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <ClipboardList size={12} strokeWidth={2.2} /> Asignación
                              </Link>
                            </div>
                            <ReorderPanel moduleIndex={mi} moduleId={mod.id} unifiedItems={unifiedItems} onReordered={() => router.refresh()} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Recursos */}
                    {!mod._new && currentModTab === 'resources' && (
                      <div style={{ padding: '16px 18px 18px' }}>
                        <ResourcesManager courseId={course.id} moduleId={mod.id} initialResources={modResources} />
                      </div>
                    )}

                    {/* TAB: Foros */}
                    {!mod._new && currentModTab === 'forums' && (
                      <div style={{ padding: '16px 18px 18px' }}>
                        <ForumsManager courseId={course.id} moduleId={mod.id} initialForums={modForums} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Evaluaciones generales */}
          {(course.courseLevelQuizzes.length > 0 || course.courseLevelAssignments.length > 0) && (
            <SectionCard>
              <SectionHeader icon={<HelpCircle size={15} strokeWidth={2.2} />} title="Evaluaciones generales del curso" subtitle="Sin módulo específico (ej. examen final)" />
              <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {course.courseLevelQuizzes.map(q => <EvaluationItem key={q.id} courseId={course.id} type="quiz" item={q} />)}
                {course.courseLevelAssignments.map(a => <EvaluationItem key={a.id} courseId={course.id} type="assignment" item={a} />)}
              </div>
            </SectionCard>
          )}

          {/* Recursos generales */}
          <SectionCard>
            <SectionHeader icon={<FileArchive size={15} strokeWidth={2.2} />} title="Recursos generales del curso" subtitle="Archivos, enlaces y foros no asociados a ningún módulo" />
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--a-border)', marginBottom: 16 }}>
                {(['res', 'for'] as const).map(tabId => {
                  const label = tabId === 'res' ? 'Recursos' : 'Foros'
                  const count = tabId === 'res' ? course.courseLevelResources.length : course.courseLevelForums.length
                  const active = (moduleTabState['__course__'] || 'res') === tabId
                  return <MiniTab key={tabId} label={label} count={count} active={active} onClick={() => setModTab('__course__', tabId)} />
                })}
              </div>
              {(moduleTabState['__course__'] || 'res') === 'res' && <ResourcesManager courseId={course.id} moduleId={null} initialResources={course.courseLevelResources} />}
              {moduleTabState['__course__'] === 'for' && <ForumsManager courseId={course.id} moduleId={null} initialForums={course.courseLevelForums} />}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Barra sticky de acciones ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 18px', background: '#fff', border: '1px solid var(--a-border)', borderRadius: 12, position: 'sticky', bottom: 16, marginTop: 20, boxShadow: '0 -4px 20px rgba(31,23,16,0.08)', zIndex: 10 }}>
        <button onClick={handleDelete} disabled={deleting} className="btn-danger" style={{ gap: 6 }}>
          <Trash size={14} strokeWidth={2.2} />{deleting ? 'Eliminando…' : 'Eliminar curso'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: isPublished ? '#059669' : 'var(--a-ink-3)' }}>{isPublished ? '● Publicado' : '○ Borrador'}</span>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ gap: 6 }}>
            <Save size={14} strokeWidth={2.2} />{saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
