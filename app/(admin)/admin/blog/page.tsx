
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileText, Eye, Pencil, ChevronLeft, Globe, FileEdit } from 'lucide-react'
import { formatDate } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export default async function AdminBlogPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, category, is_published, read_time, published_at, created_at, updated_at')
    .order('created_at', { ascending: false })

  const list = (posts || []) as any[]
  const published = list.filter(p => p.is_published).length
  const drafts = list.filter(p => !p.is_published).length

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--a-ink-3)', textDecoration: 'none', marginBottom: 8 }}>
            <ChevronLeft size={12} strokeWidth={2.5} />
            Panel
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--a-ink)', margin: 0 }}>
            Blog
          </h1>
          <p style={{ fontSize: 13, color: 'var(--a-ink-3)', marginTop: 4, marginBottom: 0 }}>
            {published} publicados · {drafts} borradores
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn-primary" style={{ gap: 6, flexShrink: 0 }}>
          <Plus size={14} strokeWidth={2.5} />
          Nuevo post
        </Link>
      </div>

      {list.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', textAlign: 'center', background: '#fff', border: '1px solid var(--a-border)', borderRadius: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--a-surface-2)', color: 'var(--a-brand)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
            <FileText size={22} strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--a-ink)', marginBottom: 8 }}>
            Aún no hay posts
          </h2>
          <p style={{ fontSize: 13, color: 'var(--a-ink-3)', maxWidth: 320, margin: '0 0 20px' }}>
            Crea tu primer artículo y publícalo en el blog.
          </p>
          <Link href="/admin/blog/new" className="btn-primary" style={{ gap: 6 }}>
            <Plus size={14} strokeWidth={2.5} />
            Crear primer post
          </Link>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--a-border)', borderRadius: 14, overflow: 'hidden' }}>
          {list.map((post, idx) => (
            <div
              key={post.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                borderBottom: idx < list.length - 1 ? '1px solid var(--a-border)' : 'none',
              }}
            >
              {/* Icon */}
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 8, background: 'var(--a-surface-2)', display: 'grid', placeItems: 'center' }}>
                {post.is_published
                  ? <Globe size={16} strokeWidth={2} style={{ color: 'var(--a-brand)' }} />
                  : <FileEdit size={16} strokeWidth={2} style={{ color: 'var(--a-ink-3)' }} />
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.title}
                  </span>
                  <span className={`badge ${post.is_published ? 'badge-mocha' : 'badge-neutral'}`}>
                    {post.is_published ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--a-ink-3)', flexWrap: 'wrap' }}>
                  <span>{post.category}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{post.read_time} min lectura</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>Actualizado {formatDate(post.updated_at || post.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {post.is_published && (
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--a-ink-2)', textDecoration: 'none' }}
                    title="Ver en el blog"
                  >
                    <Eye size={12} strokeWidth={2.2} />
                    Ver
                  </Link>
                )}
                <Link
                  href={`/admin/blog/${post.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: 'var(--a-brand)', border: '1px solid var(--a-brand)', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none' }}
                >
                  <Pencil size={12} strokeWidth={2.2} />
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
