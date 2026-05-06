'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { MessageCircle, Send, Reply, Trash2 } from 'lucide-react'

type Props = {
  lessonId: string
  previewMode?: boolean
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

export default function LessonComments({ lessonId, previewMode }: Props) {
  const { showToast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!alive) return
      setCurrentUserId(user?.id || null)

      // Obtener rol del usuario actual
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (alive) setCurrentUserRole(prof?.role || null)
      }

      // Cargar comentarios
      const { data: rawComments, error } = await supabase
        .from('lesson_comments')
        .select('id, author_id, parent_id, content, created_at')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading comments:', error)
        if (alive) {
          setComments([])
          setLoading(false)
        }
        return
      }

      if (!rawComments || rawComments.length === 0) {
        if (alive) {
          setComments([])
          setLoading(false)
        }
        return
      }

      // Batch fetch de perfiles (sin join implícito para ser robustos)
      const authorIds = Array.from(new Set(rawComments.map(c => c.author_id)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', authorIds)

      const profileMap = new Map((profiles || []).map(p => [p.id, p]))

      const enriched: Comment[] = rawComments.map(c => ({
        ...c,
        profile: profileMap.get(c.author_id) || null,
      }))

      if (alive) {
        setComments(enriched)
        setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [lessonId])

  async function handleCreate(content: string, parentId: string | null = null) {
    if (!content.trim()) return
    if (previewMode) {
      showToast('Vista previa: no se pueden enviar comentarios', 'info')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        author_id: user!.id,
        parent_id: parentId,
        content: content.trim(),
      })
      .select('id, author_id, parent_id, content, created_at')
      .single()

    setSubmitting(false)

    if (error) {
      showToast('Error al enviar: ' + error.message, 'error')
      return
    }

    if (data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user!.id)
        .single()

      const enriched: Comment = { ...data, profile: profile || null }
      setComments([...comments, enriched])
      if (parentId) {
        setReplyingTo(null)
        setReplyContent('')
      } else {
        setNewComment('')
      }
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('¿Eliminar este comentario?')) return
    const supabase = createClient()
    const { error } = await supabase.from('lesson_comments').delete().eq('id', commentId)
    if (error) {
      showToast('Error al eliminar', 'error')
      return
    }
    setComments(comments.filter(c => c.id !== commentId && c.parent_id !== commentId))
  }

  const topLevelComments = comments.filter(c => !c.parent_id)
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_id) (acc[c.parent_id] ||= []).push(c)
    return acc
  }, {} as Record<string, Comment[]>)

  return (
    <div style={{
      marginTop: 24,
      padding: 24,
      background: '#fff',
      border: '1px solid rgba(31,23,16,0.08)',
      borderRadius: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 14,
        borderBottom: '1px solid rgba(31,23,16,0.06)',
        marginBottom: 16,
      }}>
        <MessageCircle size={16} strokeWidth={2.2} style={{ color: '#1F1710' }} />
        <h3 style={{
          fontSize: 15, fontWeight: 700, color: '#1F1710', margin: 0,
        }}>
          Comentarios
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#8A7860',
          background: '#F5EFE6', padding: '2px 8px', borderRadius: 100,
        }}>
          {comments.length}
        </span>
      </div>

      {/* Banner explicativo */}
      <div style={{
        background: '#E6F1FB',
        color: '#185FA5',
        padding: 12,
        borderRadius: 8,
        fontSize: 12, lineHeight: 1.5,
        marginBottom: 18,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <MessageCircle size={14} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Si tienes alguna duda sobre el tema, te invitamos a leer las preguntas de tus compañeros o a realizar tus propias preguntas y comentarios.
        </span>
      </div>

      {/* Formulario nuevo comentario */}
      <div style={{ marginBottom: 22 }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe tu comentario o pregunta…"
          rows={3}
          disabled={previewMode}
          style={{
            width: '100%',
            padding: 12,
            background: previewMode ? '#FAF7F2' : '#fff',
            border: '1px solid rgba(31,23,16,0.12)',
            borderRadius: 8,
            fontSize: 13, color: '#1F1710',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 80,
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10,
        }}>
          <button
            onClick={() => setNewComment('')}
            disabled={!newComment}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(31,23,16,0.15)',
              borderRadius: 100,
              fontSize: 12, fontWeight: 600, color: '#6B5E4E',
              cursor: newComment ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              opacity: newComment ? 1 : 0.5,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleCreate(newComment)}
            disabled={submitting || !newComment.trim() || previewMode}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px',
              background: '#185FA5', color: '#fff',
              border: 'none', borderRadius: 100,
              fontSize: 12, fontWeight: 700,
              cursor: submitting || !newComment.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !newComment.trim() ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            <Send size={12} strokeWidth={2.2} />
            {submitting ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>

      {/* Lista de comentarios */}
      <div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#8A7860', fontSize: 13 }}>
            Cargando…
          </div>
        ) : topLevelComments.length === 0 ? (
          <div style={{
            padding: 32, textAlign: 'center',
            background: '#FAF7F2', borderRadius: 10,
            color: '#8A7860', fontSize: 13,
          }}>
            Aún no hay comentarios. ¡Sé el primero!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {topLevelComments.map(c => (
              <CommentBubble
                key={c.id}
                comment={c}
                replies={repliesByParent[c.id] || []}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyClick={(id) => { setReplyingTo(id); setReplyContent('') }}
                onReplyChange={setReplyContent}
                onReplySubmit={(parentId) => handleCreate(replyContent, parentId)}
                onCancelReply={() => { setReplyingTo(null); setReplyContent('') }}
                onDelete={handleDelete}
                submitting={submitting}
                previewMode={!!previewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentBubble({
  comment, replies, currentUserId, currentUserRole,
  replyingTo, replyContent,
  onReplyClick, onReplyChange, onReplySubmit, onCancelReply, onDelete,
  submitting, isReply = false, previewMode,
}: {
  comment: Comment
  replies: Comment[]
  currentUserId: string | null
  currentUserRole: string | null
  replyingTo: string | null
  replyContent: string
  onReplyClick: (id: string) => void
  onReplyChange: (v: string) => void
  onReplySubmit: (parentId: string) => void
  onCancelReply: () => void
  onDelete: (id: string) => void
  submitting: boolean
  isReply?: boolean
  previewMode: boolean
}) {
  const authorName = comment.profile?.full_name || comment.profile?.email || 'Usuario'
  const isAdmin = comment.profile?.role === 'admin'
  const canDelete = !previewMode && (comment.author_id === currentUserId || currentUserRole === 'admin')
  const isOwn = comment.author_id === currentUserId

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isAdmin ? '#1F1710' : '#8B6F47',
        color: '#F4ECDF',
        display: 'grid', placeItems: 'center',
        fontSize: 13, fontWeight: 700,
        flexShrink: 0,
      }}>
        {authorName[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 4, flexWrap: 'wrap',
        }}>
          <strong style={{ fontSize: 13, color: '#1F1710' }}>
            {authorName}
          </strong>
          {isAdmin && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '2px 6px',
              background: '#1F1710', color: '#F4ECDF',
              borderRadius: 3, letterSpacing: '0.04em',
            }}>
              INSTRUCTOR
            </span>
          )}
          {isOwn && (
            <span style={{ fontSize: 10, color: '#8A7860', fontWeight: 600 }}>
              (tú)
            </span>
          )}
          <span style={{ fontSize: 11, color: '#8A7860' }}>
            · {relativeTime(comment.created_at)}
          </span>
        </div>
        <div style={{
          fontSize: 13, color: '#3A2D20', lineHeight: 1.55,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {comment.content}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
          {!isReply && !previewMode && (
            <button
              onClick={() => onReplyClick(comment.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none',
                fontSize: 11, fontWeight: 700, color: '#185FA5',
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                letterSpacing: '0.04em',
              }}
            >
              <Reply size={12} strokeWidth={2.2} />
              RESPONDER
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none',
                fontSize: 11, fontWeight: 600, color: '#C2410C',
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              }}
            >
              <Trash2 size={11} strokeWidth={2.2} />
              Eliminar
            </button>
          )}
        </div>

        {replyingTo === comment.id && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#FAF7F2',
            border: '1px solid rgba(31,23,16,0.06)',
            borderRadius: 8,
          }}>
            <textarea
              value={replyContent}
              onChange={(e) => onReplyChange(e.target.value)}
              placeholder="Escribe tu respuesta…"
              rows={2}
              autoFocus
              style={{
                width: '100%',
                padding: 10,
                background: '#fff',
                border: '1px solid rgba(31,23,16,0.12)',
                borderRadius: 6,
                fontSize: 12, color: '#1F1710',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: 60,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
              <button
                onClick={onCancelReply}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid rgba(31,23,16,0.15)',
                  borderRadius: 100,
                  fontSize: 11, fontWeight: 600, color: '#6B5E4E',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => onReplySubmit(comment.id)}
                disabled={submitting || !replyContent.trim()}
                style={{
                  padding: '6px 14px',
                  background: '#185FA5', color: '#fff',
                  border: 'none', borderRadius: 100,
                  fontSize: 11, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !replyContent.trim() ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                Responder
              </button>
            </div>
          </div>
        )}

        {replies.length > 0 && (
          <div style={{
            marginTop: 14, paddingLeft: 16,
            borderLeft: '2px solid rgba(31,23,16,0.06)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {replies.map(r => (
              <CommentBubble
                key={r.id}
                comment={r}
                replies={[]}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyClick={onReplyClick}
                onReplyChange={onReplyChange}
                onReplySubmit={onReplySubmit}
                onCancelReply={onCancelReply}
                onDelete={onDelete}
                submitting={submitting}
                previewMode={previewMode}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function relativeTime(iso: string) {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es')
}
