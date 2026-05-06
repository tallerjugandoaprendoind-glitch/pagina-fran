'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  MessageCircle, Send, Trash2, Reply, ChevronDown,
  ChevronRight, User, RefreshCw, AlertCircle,
} from 'lucide-react'

type Forum = {
  id: string
  title: string
  description: string
  module_id: string | null
  module_title?: string
}

type Post = {
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

type ForumWithPosts = Forum & {
  posts: Post[]
  loadingPosts: boolean
  expanded: boolean
}

type Props = {
  courseId: string
  forums: Forum[]
}

export default function AdminForumsTab({ courseId, forums }: Props) {
  const { showToast } = useToast()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [forumsState, setForumsState] = useState<ForumWithPosts[]>(
    forums.map(f => ({ ...f, posts: [], loadingPosts: false, expanded: false }))
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
  }, [])

  const loadPosts = useCallback(async (forumId: string) => {
    setForumsState(prev =>
      prev.map(f => f.id === forumId ? { ...f, loadingPosts: true } : f)
    )

    const supabase = createClient()
    const { data: rawPosts } = await supabase
      .from('forum_posts')
      .select('id, author_id, parent_id, content, created_at')
      .eq('forum_id', forumId)
      .order('created_at', { ascending: true })

    if (!rawPosts || rawPosts.length === 0) {
      setForumsState(prev =>
        prev.map(f => f.id === forumId ? { ...f, posts: [], loadingPosts: false } : f)
      )
      return
    }

    const authorIds = Array.from(new Set(rawPosts.map(p => p.author_id)))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', authorIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const enriched: Post[] = rawPosts.map(p => ({
      ...p,
      profile: profileMap.get(p.author_id) || null,
    }))

    setForumsState(prev =>
      prev.map(f => f.id === forumId ? { ...f, posts: enriched, loadingPosts: false } : f)
    )
  }, [])

  const toggleForum = useCallback(async (forumId: string) => {
    const forum = forumsState.find(f => f.id === forumId)
    if (!forum) return

    if (!forum.expanded) {
      setForumsState(prev => prev.map(f => f.id === forumId ? { ...f, expanded: true } : f))
      if (forum.posts.length === 0) {
        await loadPosts(forumId)
      }
    } else {
      setForumsState(prev => prev.map(f => f.id === forumId ? { ...f, expanded: false } : f))
    }
  }, [forumsState, loadPosts])

  const handlePostAdded = useCallback((forumId: string, post: Post) => {
    setForumsState(prev =>
      prev.map(f => f.id === forumId ? { ...f, posts: [...f.posts, post] } : f)
    )
  }, [])

  const handleDelete = useCallback(async (forumId: string, postId: string) => {
    if (!confirm('¿Eliminar este mensaje y sus respuestas?')) return
    const supabase = createClient()
    await supabase.from('forum_posts').delete().eq('id', postId)
    setForumsState(prev =>
      prev.map(f => f.id === forumId
        ? { ...f, posts: f.posts.filter(p => p.id !== postId && p.parent_id !== postId) }
        : f
      )
    )
    showToast('Mensaje eliminado', 'info')
  }, [showToast])

  if (forums.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '48px 24px', textAlign: 'center',
        background: '#fff', border: '1px solid var(--a-border)',
        borderRadius: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#E0F2FE', color: '#0369A1',
          display: 'grid', placeItems: 'center', marginBottom: 14,
        }}>
          <MessageCircle size={22} strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--a-ink)', marginBottom: 6 }}>
          No hay foros en este curso
        </h3>
        <p style={{ fontSize: 13, color: 'var(--a-ink-3)', maxWidth: 340, margin: 0 }}>
          Crea foros desde la pestaña <strong>Contenido</strong> dentro de cada módulo o en los recursos generales del curso.
        </p>
      </div>
    )
  }

  // Agrupar por módulo
  const byModule: Record<string, ForumWithPosts[]> = {}
  const courseLevel: ForumWithPosts[] = []

  for (const f of forumsState) {
    if (f.module_id) {
      if (!byModule[f.module_id]) byModule[f.module_id] = []
      byModule[f.module_id].push(f)
    } else {
      courseLevel.push(f)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Foros del curso (sin módulo) */}
      {courseLevel.length > 0 && (
        <Section title="Foros generales del curso" count={courseLevel.length}>
          {courseLevel.map(forum => (
            <ForumCard
              key={forum.id}
              forum={forum}
              currentUserId={currentUserId}
              onToggle={() => toggleForum(forum.id)}
              onPostAdded={(post) => handlePostAdded(forum.id, post)}
              onDelete={(postId) => handleDelete(forum.id, postId)}
              onRefresh={() => loadPosts(forum.id)}
            />
          ))}
        </Section>
      )}

      {/* Foros por módulo */}
      {Object.entries(byModule).map(([moduleId, moduleForums]) => (
        <Section
          key={moduleId}
          title={moduleForums[0].module_title || 'Módulo'}
          count={moduleForums.length}
          isModule
        >
          {moduleForums.map(forum => (
            <ForumCard
              key={forum.id}
              forum={forum}
              currentUserId={currentUserId}
              onToggle={() => toggleForum(forum.id)}
              onPostAdded={(post) => handlePostAdded(forum.id, post)}
              onDelete={(postId) => handleDelete(forum.id, postId)}
              onRefresh={() => loadPosts(forum.id)}
            />
          ))}
        </Section>
      ))}
    </div>
  )
}

/* ── Section wrapper ── */
function Section({ title, count, isModule, children }: {
  title: string; count: number; isModule?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        {isModule && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--a-brand)', flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--a-ink-2)',
          letterSpacing: '0.03em',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: 'var(--a-surface-2)', color: 'var(--a-ink-3)',
          padding: '2px 7px', borderRadius: 100,
        }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

/* ── ForumCard ── */
function ForumCard({ forum, currentUserId, onToggle, onPostAdded, onDelete, onRefresh }: {
  forum: ForumWithPosts
  currentUserId: string | null
  onToggle: () => void
  onPostAdded: (post: Post) => void
  onDelete: (postId: string) => void
  onRefresh: () => void
}) {
  const topLevel = forum.posts.filter(p => !p.parent_id)
  const repliesByParent = forum.posts.reduce((acc, p) => {
    if (p.parent_id) (acc[p.parent_id] ||= []).push(p)
    return acc
  }, {} as Record<string, Post[]>)

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${forum.expanded ? 'var(--a-brand)' : 'var(--a-border)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Header clickeable */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          cursor: 'pointer',
          background: forum.expanded ? 'var(--a-surface)' : 'transparent',
          transition: 'background .1s',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 7,
          background: '#E0F2FE', color: '#0369A1',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <MessageCircle size={14} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--a-ink)',
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
        <span style={{
          fontSize: 10, fontWeight: 600, color: '#0369A1',
          background: '#E0F2FE', padding: '2px 8px', borderRadius: 100,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {forum.loadingPosts ? '…' : `${forum.posts.length} msg`}
        </span>
        {forum.expanded ? (
          <ChevronDown size={15} color="var(--a-ink-3)" style={{ flexShrink: 0 }} />
        ) : (
          <ChevronRight size={15} color="var(--a-ink-3)" style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Body expandido */}
      {forum.expanded && (
        <div style={{ borderTop: '1px solid var(--a-border)' }}>
          {/* Descripción del foro */}
          {forum.description && (
            <div style={{
              margin: '14px 16px 0',
              padding: 10,
              background: '#F5EFE6',
              border: '1px solid #EDE4D4',
              borderRadius: 8,
              fontSize: 12, color: '#3A2D20', lineHeight: 1.5,
            }}>
              {forum.description}
            </div>
          )}

          {/* Posts */}
          <div style={{ padding: '14px 16px' }}>
            {forum.loadingPosts ? (
              <div style={{
                padding: '24px', textAlign: 'center',
                color: 'var(--a-ink-3)', fontSize: 13,
              }}>
                Cargando mensajes…
              </div>
            ) : topLevel.length === 0 ? (
              <div style={{
                padding: '20px', textAlign: 'center',
                background: 'var(--a-surface)', borderRadius: 8,
                color: 'var(--a-ink-3)', fontSize: 12,
              }}>
                Aún no hay participaciones en este foro.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {topLevel.map(post => (
                  <AdminPostBubble
                    key={post.id}
                    post={post}
                    replies={repliesByParent[post.id] || []}
                    currentUserId={currentUserId}
                    forumId={forum.id}
                    onPostAdded={onPostAdded}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

            {/* Refresh + Reply box */}
            {!forum.loadingPosts && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onRefresh() }}
                  title="Recargar mensajes"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px',
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

            {/* Admin reply box */}
            <AdminReplyBox
              forumId={forum.id}
              parentId={null}
              placeholder="Escribe una respuesta como administrador…"
              onPosted={onPostAdded}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── AdminPostBubble ── */
function AdminPostBubble({ post, replies, currentUserId, forumId, onPostAdded, onDelete }: {
  post: Post
  replies: Post[]
  currentUserId: string | null
  forumId: string
  onPostAdded: (post: Post) => void
  onDelete: (postId: string) => void
}) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const authorName = post.profile?.full_name || post.profile?.email || 'Usuario'
  const isAdmin = post.profile?.role === 'admin'
  const canDelete = post.author_id === currentUserId || true // admins can delete any

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: isAdmin ? '#1F1710' : '#8B6F47',
        color: '#F4ECDF',
        display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {authorName[0].toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Author info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <strong style={{ fontSize: 12, color: 'var(--a-ink)' }}>{authorName}</strong>
          {isAdmin && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '1px 5px',
              background: '#1F1710', color: '#F4ECDF',
              borderRadius: 3, letterSpacing: '0.04em',
            }}>
              ADMIN
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>
            · {relativeTime(post.created_at)}
          </span>
        </div>

        {/* Content */}
        <div style={{
          fontSize: 13, color: '#3A2D20', lineHeight: 1.55,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          padding: '8px 10px',
          background: isAdmin ? '#F5EFE6' : 'var(--a-surface)',
          border: `1px solid ${isAdmin ? '#EDE4D4' : 'var(--a-border)'}`,
          borderRadius: 8,
        }}>
          {post.content}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            onClick={() => setShowReplyBox(v => !v)}
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
            onClick={() => onDelete(post.id)}
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

        {/* Inline reply box */}
        {showReplyBox && (
          <div style={{ marginTop: 8 }}>
            <AdminReplyBox
              forumId={forumId}
              parentId={post.id}
              placeholder="Escribe tu respuesta…"
              onPosted={(p) => { onPostAdded(p); setShowReplyBox(false) }}
              onCancel={() => setShowReplyBox(false)}
            />
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div style={{
            marginTop: 10, paddingLeft: 14,
            borderLeft: '2px solid var(--a-border)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {replies.map(reply => (
              <AdminPostBubble
                key={reply.id}
                post={reply}
                replies={[]}
                currentUserId={currentUserId}
                forumId={forumId}
                onPostAdded={onPostAdded}
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
function AdminReplyBox({ forumId, parentId, placeholder, onPosted, onCancel }: {
  forumId: string
  parentId: string | null
  placeholder: string
  onPosted: (post: Post) => void
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
      .from('forum_posts')
      .insert({
        forum_id: forumId,
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
      showToast(parentId ? 'Respuesta publicada' : 'Mensaje publicado', 'success')
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
        }}
        onFocus={e => e.target.style.borderColor = 'var(--a-brand)'}
        onBlur={e => e.target.style.borderColor = 'var(--a-border)'}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
        {onCancel && (
          <button onClick={onCancel} className="btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}>
            Cancelar
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="btn-primary"
          style={{ fontSize: 11, padding: '5px 14px', gap: 5, opacity: submitting || !content.trim() ? 0.6 : 1 }}
        >
          <Send size={11} strokeWidth={2.2} />
          {submitting ? 'Publicando…' : 'Publicar'}
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
