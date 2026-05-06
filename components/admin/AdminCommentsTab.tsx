'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  MessageCircle, Send, Trash2, Reply,
  ChevronDown, ChevronRight, RefreshCw, PlayCircle,
} from 'lucide-react'

type Lesson = {
  id: string
  title: string
  order: number
  module_title: string
  module_order: number
}

type Comment = {
  id: string
  author_id: string
  parent_id: string | null
  content: string
  created_at: string
  profile: {
    full_name: string | null
    email: string
    role: string
  } | null
}

type LessonWithComments = Lesson & {
  comments: Comment[]
  loading: boolean
  expanded: boolean
  totalCount: number | null
}

type Props = {
  lessons: Lesson[]
}

export default function AdminCommentsTab({ lessons }: Props) {
  const { showToast } = useToast()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [state, setState] = useState<LessonWithComments[]>(
    lessons.map(l => ({ ...l, comments: [], loading: false, expanded: false, totalCount: null }))
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
  }, [])

  const loadComments = useCallback(async (lessonId: string) => {
    setState(prev => prev.map(l => l.id === lessonId ? { ...l, loading: true } : l))

    const supabase = createClient()
    const { data: raw } = await supabase
      .from('lesson_comments')
      .select('id, author_id, parent_id, content, created_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })

    if (!raw || raw.length === 0) {
      setState(prev => prev.map(l => l.id === lessonId
        ? { ...l, comments: [], loading: false, totalCount: 0 }
        : l
      ))
      return
    }

    const authorIds = Array.from(new Set(raw.map(c => c.author_id)))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', authorIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const enriched: Comment[] = raw.map(c => ({
      ...c,
      profile: profileMap.get(c.author_id) || null,
    }))

    setState(prev => prev.map(l => l.id === lessonId
      ? { ...l, comments: enriched, loading: false, totalCount: enriched.length }
      : l
    ))
  }, [])

  const toggleLesson = useCallback(async (lessonId: string) => {
    const lesson = state.find(l => l.id === lessonId)
    if (!lesson) return
    if (!lesson.expanded) {
      setState(prev => prev.map(l => l.id === lessonId ? { ...l, expanded: true } : l))
      if (lesson.totalCount === null) await loadComments(lessonId)
    } else {
      setState(prev => prev.map(l => l.id === lessonId ? { ...l, expanded: false } : l))
    }
  }, [state, loadComments])

  const handleCommentAdded = useCallback((lessonId: string, comment: Comment) => {
    setState(prev => prev.map(l => l.id === lessonId
      ? { ...l, comments: [...l.comments, comment], totalCount: (l.totalCount || 0) + 1 }
      : l
    ))
  }, [])

  const handleDelete = useCallback(async (lessonId: string, commentId: string) => {
    if (!confirm('¿Eliminar este comentario y sus respuestas?')) return
    const supabase = createClient()
    await supabase.from('lesson_comments').delete().eq('id', commentId)
    setState(prev => prev.map(l => {
      if (l.id !== lessonId) return l
      const filtered = l.comments.filter(c => c.id !== commentId && c.parent_id !== commentId)
      return { ...l, comments: filtered, totalCount: filtered.length }
    }))
    showToast('Comentario eliminado', 'info')
  }, [showToast])

  if (lessons.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '48px 24px', textAlign: 'center',
        background: '#fff', border: '1px solid var(--a-border)', borderRadius: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#E6F1FB', color: '#185FA5',
          display: 'grid', placeItems: 'center', marginBottom: 14,
        }}>
          <MessageCircle size={22} strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--a-ink)', marginBottom: 6 }}>
          No hay lecciones en este curso
        </h3>
        <p style={{ fontSize: 13, color: 'var(--a-ink-3)', margin: 0 }}>
          Agrega lecciones desde la pestaña <strong>Contenido</strong>.
        </p>
      </div>
    )
  }

  // Agrupar por módulo
  const byModule: Record<string, LessonWithComments[]> = {}
  for (const l of state) {
    const key = l.module_title
    if (!byModule[key]) byModule[key] = []
    byModule[key].push(l)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(byModule).map(([moduleTitle, moduleLessons]) => (
        <div key={moduleTitle}>
          {/* Módulo header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--a-brand)', flexShrink: 0,
            }} />
            <span style={{
              fontSize: 12, fontWeight: 700, color: 'var(--a-ink-2)',
              letterSpacing: '0.03em',
            }}>
              {moduleTitle}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'var(--a-surface-2)', color: 'var(--a-ink-3)',
              padding: '2px 7px', borderRadius: 100,
            }}>
              {moduleLessons.length} {moduleLessons.length === 1 ? 'lección' : 'lecciones'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {moduleLessons.map(lesson => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                currentUserId={currentUserId}
                onToggle={() => toggleLesson(lesson.id)}
                onCommentAdded={(c) => handleCommentAdded(lesson.id, c)}
                onDelete={(cId) => handleDelete(lesson.id, cId)}
                onRefresh={() => loadComments(lesson.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── LessonCard ── */
function LessonCard({ lesson, currentUserId, onToggle, onCommentAdded, onDelete, onRefresh }: {
  lesson: LessonWithComments
  currentUserId: string | null
  onToggle: () => void
  onCommentAdded: (c: Comment) => void
  onDelete: (commentId: string) => void
  onRefresh: () => void
}) {
  const topLevel = lesson.comments.filter(c => !c.parent_id)
  const repliesByParent = lesson.comments.reduce((acc, c) => {
    if (c.parent_id) (acc[c.parent_id] ||= []).push(c)
    return acc
  }, {} as Record<string, Comment[]>)

  const totalCount = lesson.totalCount

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${lesson.expanded ? 'var(--a-brand)' : 'var(--a-border)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Header clickeable */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', cursor: 'pointer',
          background: lesson.expanded ? 'var(--a-surface)' : 'transparent',
          transition: 'background .1s',
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: '#FAEEDA', color: '#854F0B',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <PlayCircle size={14} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--a-ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {lesson.title || 'Sin título'}
          </div>
        </div>

        {/* Contador */}
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: totalCount === null ? 'var(--a-surface-2)' : totalCount > 0 ? '#E6F1FB' : 'var(--a-surface-2)',
          color: totalCount !== null && totalCount > 0 ? '#185FA5' : 'var(--a-ink-3)',
          padding: '2px 8px', borderRadius: 100,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {lesson.loading ? '…' : totalCount === null ? 'ver' : `${totalCount} comentarios`}
        </span>

        {lesson.expanded
          ? <ChevronDown size={15} color="var(--a-ink-3)" style={{ flexShrink: 0 }} />
          : <ChevronRight size={15} color="var(--a-ink-3)" style={{ flexShrink: 0 }} />
        }
      </div>

      {/* Body expandido */}
      {lesson.expanded && (
        <div style={{ borderTop: '1px solid var(--a-border)', padding: '14px 16px' }}>
          {lesson.loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--a-ink-3)', fontSize: 13 }}>
              Cargando comentarios…
            </div>
          ) : topLevel.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              background: 'var(--a-surface)', borderRadius: 8,
              color: 'var(--a-ink-3)', fontSize: 12, marginBottom: 12,
            }}>
              Aún no hay comentarios en esta lección.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
              {topLevel.map(comment => (
                <AdminCommentBubble
                  key={comment.id}
                  comment={comment}
                  replies={repliesByParent[comment.id] || []}
                  currentUserId={currentUserId}
                  lessonId={lesson.id}
                  onCommentAdded={onCommentAdded}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}

          {/* Acciones */}
          {!lesson.loading && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRefresh() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px',
                  background: 'var(--a-surface)',
                  border: '1px solid var(--a-border)',
                  borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: 'var(--a-ink-3)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <RefreshCw size={11} strokeWidth={2.2} />
                Actualizar
              </button>
            </div>
          )}

          {/* Caja de respuesta del admin */}
          <AdminReplyBox
            lessonId={lesson.id}
            parentId={null}
            placeholder="Escribe un comentario como administrador…"
            onPosted={onCommentAdded}
          />
        </div>
      )}
    </div>
  )
}

/* ── AdminCommentBubble ── */
function AdminCommentBubble({ comment, replies, currentUserId, lessonId, onCommentAdded, onDelete }: {
  comment: Comment
  replies: Comment[]
  currentUserId: string | null
  lessonId: string
  onCommentAdded: (c: Comment) => void
  onDelete: (commentId: string) => void
}) {
  const [showReply, setShowReply] = useState(false)
  const authorName = comment.profile?.full_name || comment.profile?.email || 'Usuario'
  const isAdmin = comment.profile?.role === 'admin'

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: isAdmin ? '#1F1710' : '#8B6F47',
        color: '#F4ECDF',
        display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {(authorName[0] || '?').toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Autor */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          flexWrap: 'wrap', marginBottom: 4,
        }}>
          <strong style={{ fontSize: 12, color: 'var(--a-ink)' }}>{authorName}</strong>
          {isAdmin && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px',
              background: '#1F1710', color: '#F4ECDF',
              borderRadius: 3, letterSpacing: '0.04em',
            }}>
              ADMIN
            </span>
          )}
          {comment.author_id === currentUserId && (
            <span style={{ fontSize: 10, color: 'var(--a-ink-3)', fontWeight: 600 }}>(tú)</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>
            · {relativeTime(comment.created_at)}
          </span>
        </div>

        {/* Contenido */}
        <div style={{
          fontSize: 13, color: '#3A2D20', lineHeight: 1.55,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          padding: '8px 10px',
          background: isAdmin ? '#F0F7FF' : 'var(--a-surface)',
          border: `1px solid ${isAdmin ? '#BFDBFE' : 'var(--a-border)'}`,
          borderRadius: 8,
        }}>
          {comment.content}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            onClick={() => setShowReply(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none',
              fontSize: 11, fontWeight: 600, color: 'var(--a-ink-3)',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            <Reply size={11} strokeWidth={2.2} />
            Responder
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none',
              fontSize: 11, fontWeight: 600, color: '#B91C1C',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            <Trash2 size={11} strokeWidth={2.2} />
            Eliminar
          </button>
        </div>

        {/* Box de respuesta inline */}
        {showReply && (
          <div style={{ marginTop: 8 }}>
            <AdminReplyBox
              lessonId={lessonId}
              parentId={comment.id}
              placeholder="Escribe tu respuesta…"
              onPosted={(c) => { onCommentAdded(c); setShowReply(false) }}
              onCancel={() => setShowReply(false)}
            />
          </div>
        )}

        {/* Respuestas anidadas */}
        {replies.length > 0 && (
          <div style={{
            marginTop: 10, paddingLeft: 14,
            borderLeft: '2px solid var(--a-border)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {replies.map(reply => (
              <AdminCommentBubble
                key={reply.id}
                comment={reply}
                replies={[]}
                currentUserId={currentUserId}
                lessonId={lessonId}
                onCommentAdded={onCommentAdded}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── AdminReplyBox ── */
function AdminReplyBox({ lessonId, parentId, placeholder, onPosted, onCancel }: {
  lessonId: string
  parentId: string | null
  placeholder: string
  onPosted: (c: Comment) => void
  onCancel?: () => void
}) {
  const { showToast } = useToast()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        author_id: user!.id,
        parent_id: parentId,
        content: content.trim(),
      })
      .select('id, author_id, parent_id, content, created_at')
      .single()

    if (error) {
      showToast('Error al publicar: ' + error.message, 'error')
      setSubmitting(false)
      return
    }

    if (data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user!.id)
        .single()

      onPosted({ ...data, profile: profile || null })
      setContent('')
      showToast(parentId ? 'Respuesta enviada' : 'Comentario publicado', 'success')
    }
    setSubmitting(false)
  }

  return (
    <div style={{
      padding: 12,
      background: '#F8F6F2',
      border: '1px solid var(--a-border-2)',
      borderRadius: 8,
    }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={!!parentId}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: '#fff',
          border: '1px solid var(--a-border)',
          borderRadius: 6,
          fontSize: 12, color: 'var(--a-ink)',
          fontFamily: 'inherit',
          resize: 'vertical', minHeight: 56,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color .15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--a-brand)'}
        onBlur={e => e.target.style.borderColor = 'var(--a-border)'}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
        {onCancel && (
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ fontSize: 11, padding: '5px 12px' }}
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="btn-primary"
          style={{
            fontSize: 11, padding: '5px 14px', gap: 5,
            opacity: submitting || !content.trim() ? 0.6 : 1,
          }}
        >
          <Send size={11} strokeWidth={2.2} />
          {submitting ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es')
}
