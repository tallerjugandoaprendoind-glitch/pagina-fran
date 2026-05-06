'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  MessageCircle, Send, User, ThumbsUp, Reply, Trash2,
} from 'lucide-react'

type Props = {
  forum: {
    id: string
    title: string
    description: string
  }
  enrollmentId: string
  onCompleted?: () => void
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

export default function ForumViewer({ forum, enrollmentId, onCompleted }: Props) {
  const { showToast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      // Cargamos los posts y buscamos los perfiles por separado
      // (no usamos join implícito para ser tolerantes con el schema)
      const { data: rawPosts } = await supabase
        .from('forum_posts')
        .select('id, author_id, parent_id, content, created_at')
        .eq('forum_id', forum.id)
        .order('created_at', { ascending: true })

      if (!rawPosts || rawPosts.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      // Batch fetch de profiles
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

      setPosts(enriched)
      setLoading(false)
    }
    load()
  }, [forum.id])

  async function handleCreatePost(content: string, parentId: string | null = null) {
    if (!content.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.from('forum_posts')
      .insert({
        forum_id: forum.id,
        author_id: user!.id,
        parent_id: parentId,
        content: content.trim(),
      })
      .select('id, author_id, parent_id, content, created_at')
      .single()

    setSubmitting(false)

    if (error) {
      showToast('Error al publicar: ' + error.message, 'error')
      return
    }

    if (data) {
      // Obtener perfil del autor
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user!.id)
        .single()

      const enrichedPost: Post = {
        ...data,
        profile: profile || null,
      }

      const isFirstPost = !posts.some(p => p.author_id === user!.id)
      setPosts([...posts, enrichedPost])
      if (parentId) {
        setReplyingTo(null)
        setReplyContent('')
      } else {
        setNewPost('')
      }
      showToast('Publicado', 'success')
      if (isFirstPost) onCompleted?.()
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('¿Eliminar este mensaje?')) return
    const supabase = createClient()
    await supabase.from('forum_posts').delete().eq('id', postId)
    setPosts(posts.filter(p => p.id !== postId && p.parent_id !== postId))
  }

  const topLevelPosts = posts.filter(p => !p.parent_id)
  const repliesByParent = posts.reduce((acc, p) => {
    if (p.parent_id) {
      (acc[p.parent_id] ||= []).push(p)
    }
    return acc
  }, {} as Record<string, Post[]>)

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(31,23,16,0.08)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '24px 28px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: '#E0F2FE', color: '#0369A1',
          borderRadius: 100,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          marginBottom: 10,
        }}>
          <MessageCircle size={11} strokeWidth={2.2} />
          FORO DE DISCUSIÓN
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em',
          color: '#1F1710', marginBottom: 10,
        }}>
          {forum.title}
        </h1>

        {forum.description && (
          <div style={{
            padding: 14,
            background: '#F5EFE6',
            border: '1px solid #EDE4D4',
            borderRadius: 10,
            fontSize: 13, color: '#3A2D20', lineHeight: 1.55,
            marginBottom: 24, whiteSpace: 'pre-wrap',
          }}>
            {forum.description}
          </div>
        )}

        {/* ── Formulario para nuevo post ── */}
        <div style={{
          padding: 16,
          background: '#FAF7F2',
          border: '1px solid #EDE4D4',
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Escribe tu participación…"
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              background: '#fff',
              border: '1px solid #D9CEB8',
              borderRadius: 8,
              fontSize: 13, color: '#1F1710',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 80,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={() => handleCreatePost(newPost)}
              disabled={submitting || !newPost.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px',
                background: '#1F1710', color: '#F4ECDF',
                border: 'none', borderRadius: 100,
                fontSize: 13, fontWeight: 700,
                cursor: submitting || !newPost.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !newPost.trim() ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              <Send size={12} strokeWidth={2.2} />
              {submitting ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </div>

        {/* ── Lista de posts ── */}
        <div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#1F1710',
            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Participaciones
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#8A7860',
              background: '#F5EFE6', padding: '2px 8px', borderRadius: 100,
            }}>
              {posts.length}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8A7860', fontSize: 13 }}>
              Cargando…
            </div>
          ) : topLevelPosts.length === 0 ? (
            <div style={{
              padding: 40, textAlign: 'center',
              background: '#FAF7F2', borderRadius: 10,
              color: '#8A7860', fontSize: 13,
            }}>
              Aún no hay participaciones. ¡Sé el primero en comentar!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topLevelPosts.map(post => (
                <PostBubble
                  key={post.id}
                  post={post}
                  replies={repliesByParent[post.id] || []}
                  currentUserId={currentUserId}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReplyClick={(id) => { setReplyingTo(id); setReplyContent('') }}
                  onReplyChange={setReplyContent}
                  onReplySubmit={(parentId) => handleCreatePost(replyContent, parentId)}
                  onCancelReply={() => { setReplyingTo(null); setReplyContent('') }}
                  onDelete={handleDelete}
                  submitting={submitting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PostBubble({
  post, replies, currentUserId,
  replyingTo, replyContent,
  onReplyClick, onReplyChange, onReplySubmit, onCancelReply, onDelete,
  submitting, isReply = false,
}: {
  post: Post
  replies: Post[]
  currentUserId: string | null
  replyingTo: string | null
  replyContent: string
  onReplyClick: (id: string) => void
  onReplyChange: (v: string) => void
  onReplySubmit: (parentId: string) => void
  onCancelReply: () => void
  onDelete: (postId: string) => void
  submitting: boolean
  isReply?: boolean
}) {
  const authorName = post.profile?.full_name || post.profile?.email || 'Usuario'
  const isAdmin = post.profile?.role === 'admin'
  const canDelete = post.author_id === currentUserId || isAdmin
  const isOwnPost = post.author_id === currentUserId

  return (
    <div style={{
      display: 'flex', gap: 12,
      padding: isReply ? '10px 0' : 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isAdmin ? '#1F1710' : '#8B6F47',
        color: '#F4ECDF',
        display: 'grid', placeItems: 'center',
        fontSize: 13, fontWeight: 700,
        flexShrink: 0,
      }}>
        {authorName[0].toUpperCase()}
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
          {isOwnPost && (
            <span style={{
              fontSize: 10, color: '#8A7860', fontWeight: 600,
            }}>
              (tú)
            </span>
          )}
          <span style={{ fontSize: 11, color: '#8A7860' }}>
            · {relativeTime(post.created_at)}
          </span>
        </div>
        <div style={{
          fontSize: 13, color: '#3A2D20', lineHeight: 1.55,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {post.content}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {!isReply && (
            <button
              onClick={() => onReplyClick(post.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none',
                fontSize: 11, fontWeight: 600, color: '#8A7860',
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              }}
            >
              <Reply size={12} strokeWidth={2.2} />
              Responder
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(post.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none',
                fontSize: 11, fontWeight: 600, color: '#C2410C',
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              }}
            >
              <Trash2 size={12} strokeWidth={2.2} />
              Eliminar
            </button>
          )}
        </div>

        {/* Formulario de respuesta */}
        {replyingTo === post.id && (
          <div style={{
            marginTop: 10,
            padding: 12,
            background: '#FAF7F2',
            border: '1px solid #EDE4D4',
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
                border: '1px solid #D9CEB8',
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
                  border: '1px solid #D9CEB8',
                  borderRadius: 100,
                  fontSize: 11, fontWeight: 600, color: '#6B5E4E',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => onReplySubmit(post.id)}
                disabled={submitting || !replyContent.trim()}
                style={{
                  padding: '6px 14px',
                  background: '#1F1710', color: '#F4ECDF',
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

        {/* Respuestas */}
        {replies.length > 0 && (
          <div style={{
            marginTop: 12, paddingLeft: 16,
            borderLeft: '2px solid #EDE4D4',
          }}>
            {replies.map(reply => (
              <PostBubble
                key={reply.id}
                post={reply}
                replies={[]}
                currentUserId={currentUserId}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyClick={onReplyClick}
                onReplyChange={onReplyChange}
                onReplySubmit={onReplySubmit}
                onCancelReply={onCancelReply}
                onDelete={onDelete}
                submitting={submitting}
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
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es')
}
