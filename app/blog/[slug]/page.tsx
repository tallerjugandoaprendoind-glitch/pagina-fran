import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { CopyLinkButton } from './CopyLinkButton'
import { Nav, Footer, WspBubble } from '@/components/shared'

interface Block {
  id: string
  type: string
  content: string
  meta?: { src?: string; alt?: string; caption?: string; align?: string; sideText?: string; emoji?: string }
}

interface Post {
  id: string; title: string; excerpt: string; content: any
  category: string; cover_url: string
  is_published: boolean; read_time: number; slug: string
  author_name: string; author_avatar: string
  published_at: string; created_at: string
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts').select('title, excerpt, cover_url')
    .eq('slug', params.slug).single()
  if (!post) return {}
  const cover = post.cover_url || ''
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, images: cover ? [cover] : [] },
  }
}

// ── Renderizador de bloques ────────────────────────────────────────────────────

function BlockRenderer({ block, index }: { block: Block; index: number }) {
  const { type, meta } = block
  // content puede ser string HTML, string plano, o en casos raros un objeto
  const rawContent = typeof block.content === 'string' ? block.content : ''
  const content = rawContent
  const sh = { dangerouslySetInnerHTML: { __html: content || '' } }

  if (type === 'divider') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '48px 0' }}>
      <div style={{ flex: 1, height: 1, background: '#ddd8cf' }} />
      <span style={{ color: '#c4783c', fontSize: 14 }}>✦</span>
      <div style={{ flex: 1, height: 1, background: '#ddd8cf' }} />
    </div>
  )

  if (type === 'image') {
    if (!meta?.src) return null
    const align = meta.align || 'full'
    const isFloat = align === 'left' || align === 'right'
    const widths: Record<string, string> = { full: '100%', center: '70%', left: '42%', right: '42%' }
    const W = widths[align] || '100%'

    if (isFloat && meta.sideText) {
      return (
        <div style={{ overflow: 'hidden', margin: '32px 0' }}>
          <figure style={{
            float: align === 'left' ? 'left' : 'right',
            width: W,
            margin: align === 'left' ? '0 28px 12px 0' : '0 0 12px 28px',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <img src={meta.src} alt={meta.alt || ''} style={{ width: '100%', display: 'block' }} />
            {meta.caption && <figcaption style={{ textAlign: 'center', fontSize: 13, color: '#9a9186', padding: '8px 12px', fontStyle: 'italic' }}>{meta.caption}</figcaption>}
          </figure>
          <div className="bp-side-text" dangerouslySetInnerHTML={{ __html: meta.sideText }} />
          <div style={{ clear: 'both' }} />
        </div>
      )
    }

    return (
      <figure style={{
        margin: '36px auto',
        width: W,
        display: 'block',
      }}>
        <img src={meta.src} alt={meta.alt || ''} style={{ width: '100%', borderRadius: 14, display: 'block', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }} />
        {meta.caption && <figcaption style={{ textAlign: 'center', fontSize: 13, color: '#9a9186', marginTop: 10, fontStyle: 'italic' }}>{meta.caption}</figcaption>}
      </figure>
    )
  }

  if (!content) return null

  if (type === 'heading1') return <h2 {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: '#1a1a18', lineHeight: 1.25, margin: '52px 0 14px' }} />
  if (type === 'heading2') return <h3 {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#1a1a18', lineHeight: 1.3, margin: '40px 0 10px' }} />
  if (type === 'heading3') return <h4 {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#1a1a18', lineHeight: 1.4, margin: '28px 0 8px' }} />

  if (type === 'quote') return (
    <blockquote style={{ margin: '36px 0', padding: '20px 24px', borderLeft: '4px solid #c4783c', background: 'linear-gradient(to right, #fdf6f0, transparent)', borderRadius: '0 10px 10px 0' }}>
      <p {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 19, fontStyle: 'italic', color: '#4a4540', lineHeight: 1.7, margin: 0 }} />
    </blockquote>
  )

  if (type === 'callout') return (
    <div style={{ display: 'flex', gap: 14, background: '#FFF8EC', border: '1.5px solid #F5D78E', borderRadius: 14, padding: '18px 22px', margin: '28px 0', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{meta?.emoji || '💡'}</span>
      <p {...sh} style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, color: '#5c3d1e', lineHeight: 1.7, margin: 0 }} />
    </div>
  )

  if (type === 'bullet') return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start', paddingLeft: 4 }}>
      <span style={{ color: '#c4783c', fontSize: 20, lineHeight: 1.7, flexShrink: 0 }}>•</span>
      <p {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#2a2825', lineHeight: 1.75, margin: 0 }} />
    </div>
  )

  if (type === 'numbered') return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start', paddingLeft: 4 }}>
      <span style={{ color: '#c4783c', fontSize: 14, fontWeight: 700, fontFamily: 'system-ui', flexShrink: 0, marginTop: 3, minWidth: 22 }}>{index + 1}.</span>
      <p {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#2a2825', lineHeight: 1.75, margin: 0 }} />
    </div>
  )

  if (type === 'code') return (
    <pre style={{ background: '#1c1c1a', borderRadius: 12, padding: '20px 24px', overflow: 'auto', margin: '28px 0', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
      <code {...sh} style={{ fontFamily: 'Fira Mono, Consolas, monospace', fontSize: 13, color: '#d4d4d4', lineHeight: 1.65 }} />
    </pre>
  )

  return <p {...sh} style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#2a2825', lineHeight: 1.85, margin: '0 0 24px' }} />
}

// ── Página principal ──────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts').select('*')
    .eq('slug', params.slug).eq('is_published', true).single()

  if (!post) notFound()

  const p: Post = {
    ...post,
    cover_url: post.cover_url || '',

  }

  // Parsear contenido — soporta array, string JSON y bloques planos
  let parsedContent = p.content
  if (typeof parsedContent === 'string') {
    try { parsedContent = JSON.parse(parsedContent) } catch { parsedContent = [] }
  }
  const rawContent = Array.isArray(parsedContent) ? parsedContent : []

  // Detectar si es formato multi-página [{id, blocks:[]}] o bloques planos
  const isMultiPage = rawContent.length > 0 && rawContent[0]?.blocks
  // pages: array de arrays de bloques, uno por página
  const pages: Block[][] = isMultiPage
    ? rawContent.map((pg: any) => Array.isArray(pg.blocks) ? pg.blocks : [])
    : [rawContent as Block[]]
  // blocks planos para TOC y conteo
  const blocks: Block[] = pages.flat()

  const publishDate = p.published_at || p.created_at
  const authorName = p.author_name || 'Francesca R.B.'
  const authorInitials = authorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const { data: related } = await supabase
    .from('blog_posts')
    .select('id, title, slug, category, cover_url, read_time, published_at')
    .eq('is_published', true).eq('category', p.category).neq('id', p.id).limit(3)

  const shareUrl = `https://capyaba.com/blog/${p.slug}`
  const shareTitle = encodeURIComponent(p.title)

  // Headings para TOC
  const headings = blocks.filter(b => b.type === 'heading1' || b.type === 'heading2')

  return (
    <>
      <style suppressHydrationWarning>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #f4f1eb; margin: 0; }
        .bp-page { background: #f4f1eb; min-height: 100vh; }

        /* Barra de progreso */
        .bp-progress { position: fixed; top: 0; left: 0; height: 3px; background: #c4783c; z-index: 9999; width: 0%; transition: width .1s linear; }

        /* Breadcrumb */
        .bp-breadcrumb {
          padding: 100px 0 20px;
          max-width: 1280px; margin: 0 auto;
          padding-left: 60px; padding-right: 60px;
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #9a9186; font-family: system-ui, sans-serif;
        }
        .bp-breadcrumb a { color: #9a9186; text-decoration: none; }
        .bp-breadcrumb a:hover { color: #c4783c; }

        /* Hero */
        .bp-hero { max-width: 1280px; margin: 0 auto 56px; padding: 0 60px; }
        .bp-hero-inner { position: relative; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
        .bp-hero img { width: 100%; height: 540px; object-fit: cover; display: block; }
        .bp-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, rgba(0,0,0,.02) 0%, rgba(0,0,0,.08) 40%, rgba(0,0,0,.75) 100%);
        }
        .bp-hero-text { position: absolute; bottom: 0; left: 0; right: 0; padding: 52px 64px 56px; }
        .bp-hero-cat {
          display: inline-block; padding: 5px 16px; border-radius: 100px;
          background: rgba(255,255,255,.2); color: #fff; border: 1px solid rgba(255,255,255,.3);
          font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          margin-bottom: 18px; backdrop-filter: blur(8px); font-family: system-ui, sans-serif;
        }
        .bp-hero-title {
          font-family: Georgia, serif; font-size: 52px; font-weight: 700;
          color: #fff; line-height: 1.08; letter-spacing: -.025em;
          margin: 0 0 14px; text-shadow: 0 2px 24px rgba(0,0,0,.4); max-width: 720px;
        }
        .bp-hero-excerpt {
          font-family: Georgia, serif; font-size: 19px; font-style: italic;
          color: rgba(255,255,255,.88); margin: 0; line-height: 1.55;
          text-shadow: 0 1px 10px rgba(0,0,0,.35); max-width: 580px;
        }

        /* Sin portada */
        .bp-no-cover { max-width: 1280px; margin: 0 auto 48px; padding: 0 60px; }
        .bp-no-cover-inner {
          background: #fff; border-radius: 28px; padding: 56px 72px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06);
        }
        .bp-nc-cat {
          display: inline-block; padding: 5px 16px; border-radius: 100px;
          background: #f2e8dc; color: #7a4020;
          font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          margin-bottom: 20px; font-family: system-ui, sans-serif;
        }
        .bp-nc-title {
          font-family: Georgia, serif; font-size: 48px; font-weight: 700;
          color: #1a1a18; line-height: 1.1; letter-spacing: -.025em; margin: 0 0 16px;
        }
        .bp-nc-excerpt {
          font-family: Georgia, serif; font-size: 19px; font-style: italic;
          color: #7a7168; margin: 0; line-height: 1.6;
        }

        /* Layout principal */
        .bp-layout {
          max-width: 1280px; margin: 0 auto;
          padding: 0 60px 100px;
          display: grid; grid-template-columns: 1fr 320px; gap: 64px;
          align-items: start;
        }

        /* Meta autor */
        .bp-meta {
          display: flex; align-items: center; gap: 14px;
          padding: 22px 0 30px; margin-bottom: 36px;
          border-bottom: 1.5px solid #e8e3db;
          font-family: system-ui, sans-serif;
        }
        .bp-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, #c4783c, #e09060);
          color: #fff; display: grid; place-items: center;
          font-size: 14px; font-weight: 800; flex-shrink: 0;
        }
        .bp-author-name { font-size: 15px; font-weight: 700; color: #1a1a18; }
        .bp-author-date { font-size: 13px; color: #9a9186; margin-top: 2px; }

        /* Contenido artículo */
        .bp-content { min-width: 0; }
        .bp-content-inner { overflow: hidden; }
        .bp-content-inner::after { content: ''; display: table; clear: both; }

        /* Sidebar */
        .bp-sidebar { position: sticky; top: 100px; display: flex; flex-direction: column; gap: 20px; font-family: system-ui, sans-serif; }

        .bp-card {
          background: #fff; border-radius: 20px; padding: 26px 28px;
          box-shadow: 0 2px 24px rgba(0,0,0,.07);
          border: 1px solid rgba(0,0,0,.04);
        }
        .bp-card-title {
          font-size: 10px; font-weight: 800; letter-spacing: .12em;
          text-transform: uppercase; color: #bbb; margin-bottom: 18px;
          display: flex; align-items: center; gap: 10px;
        }
        .bp-card-title::after { content: ''; flex: 1; height: 1px; background: #f0ece6; }

        /* Botones compartir */
        .share-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px; border-radius: 12px;
          font-size: 13px; font-weight: 700; text-decoration: none;
          cursor: pointer; transition: opacity .15s; margin-bottom: 8px;
          border: none; width: 100%; font-family: system-ui, sans-serif;
        }
        .share-btn:last-child { margin-bottom: 0; }
        .share-btn:hover { opacity: .88; }
        .share-x { background: #000; color: #fff; }
        .share-wa { background: #25d366; color: #fff; }
        .share-link { background: #f5f2ee; color: #555; border: 1.5px solid #e8e3db !important; }

        /* TOC */
        .bp-toc-item {
          display: block; padding: 8px 12px; border-radius: 10px;
          font-size: 13px; color: #7a7168; text-decoration: none;
          transition: all .15s; line-height: 1.4; margin-bottom: 2px;
          font-family: system-ui, sans-serif;
        }
        .bp-toc-item:hover { background: #f5f0e8; color: #c4783c; padding-left: 16px; }

        /* Autor card */
        .bp-author-card { text-align: center; }
        .bp-author-avatar-lg {
          width: 64px; height: 64px; border-radius: 50%;
          background: linear-gradient(135deg, #c4783c, #e09060);
          color: #fff; display: grid; place-items: center;
          font-size: 20px; font-weight: 800; margin: 0 auto 14px;
        }
        .bp-author-card-name { font-size: 16px; font-weight: 700; color: #1a1a18; margin-bottom: 8px; }
        .bp-author-card-bio { font-size: 13px; color: #9a9186; line-height: 1.55; }
        .bp-author-link {
          display: inline-block; margin-top: 16px; padding: 9px 20px;
          background: #f2e8dc; color: #7a4020; border-radius: 100px;
          font-size: 13px; font-weight: 700; text-decoration: none;
        }

        /* Tags */
        .bp-tag {
          display: inline-block; padding: 5px 14px; border-radius: 100px;
          background: #f2e8dc; color: #7a4020;
          font-size: 12px; font-weight: 700; margin: 3px;
          font-family: system-ui, sans-serif;
        }

        /* Texto lateral imagen */
        .bp-side-text { font-family: Georgia, serif; font-size: 17px; line-height: 1.8; color: #2a2825; }
        .bp-side-text p { margin: 0 0 16px; }
        .bp-side-text h1, .bp-side-text h2 { font-family: Georgia, serif; font-size: 22px; font-weight: 700; color: #1a1a18; line-height: 1.3; margin: 0 0 12px; }
        .bp-side-text h3 { font-family: Georgia, serif; font-size: 18px; font-weight: 700; color: #1a1a18; margin: 0 0 10px; }
        .bp-side-text strong, .bp-side-text b { font-weight: 700; color: #1a1a18; }

        /* Artículos relacionados */
        .bp-related { max-width: 1280px; margin: 0 auto; padding: 0 60px 100px; }
        .bp-related-title {
          font-family: Georgia, serif; font-size: 28px; font-weight: 700;
          color: #1a1a18; margin-bottom: 28px;
        }
        .bp-related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .bp-related-card {
          background: #fff; border-radius: 20px; overflow: hidden;
          text-decoration: none; transition: transform .2s, box-shadow .2s;
          box-shadow: 0 2px 16px rgba(0,0,0,.06);
        }
        .bp-related-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,.12); }
        .bp-related-img { width: 100%; height: 180px; object-fit: cover; display: block; }
        .bp-related-body { padding: 20px 22px; }
        .bp-related-cat { font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c4783c; margin-bottom: 8px; font-family: system-ui, sans-serif; }
        .bp-related-ttl { font-family: Georgia, serif; font-size: 16px; font-weight: 700; color: #1a1a18; line-height: 1.35; margin-bottom: 10px; }
        .bp-related-meta { font-size: 12px; color: #9a9186; font-family: system-ui, sans-serif; }

        /* Responsive */
        @media (max-width: 1024px) {
          .bp-hero, .bp-no-cover, .bp-layout, .bp-related { padding-left: 32px; padding-right: 32px; }
          .bp-layout { grid-template-columns: 1fr; gap: 40px; }
          .bp-sidebar { position: static; }
          .bp-hero-title { font-size: 38px; }
          .bp-hero-text { padding: 36px 40px 44px; }
          .bp-no-cover-inner { padding: 36px 40px; }
          .bp-nc-title { font-size: 36px; }
          .bp-related-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .bp-hero, .bp-no-cover, .bp-layout, .bp-related { padding-left: 16px; padding-right: 16px; }
          .bp-breadcrumb { padding-left: 16px; padding-right: 16px; }
          .bp-hero img { height: 340px; }
          .bp-hero-title { font-size: 28px; }
          .bp-hero-text { padding: 24px 24px 32px; }
          .bp-related-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div id="bp-progress" className="bp-progress" suppressHydrationWarning />
      <Nav />
      <div className="bp-page">

        {/* Breadcrumb */}
        <nav className="bp-breadcrumb">
          <Link href="/blog">← Blog</Link>
          <span className="bp-breadcrumb-sep">/</span>
          <span>{p.category}</span>
        </nav>

        {/* Hero o header sin imagen */}
        {p.cover_url ? (
          <div className="bp-hero">
            <div className="bp-hero-inner">
              <img src={p.cover_url} alt={p.title} />
              <div className="bp-hero-overlay" />
              <div className="bp-hero-text">
                <span className="bp-hero-cat">{p.category}</span>
                <h1 className="bp-hero-title">{p.title}</h1>
                {p.excerpt && <p className="bp-hero-excerpt">{p.excerpt}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bp-no-cover">
            <div className="bp-no-cover-inner">
              <span className="bp-nc-cat">{p.category}</span>
              <h1 className="bp-nc-title">{p.title}</h1>
              {p.excerpt && <p className="bp-nc-excerpt">{p.excerpt}</p>}
            </div>
          </div>
        )}

        {/* Layout: contenido + sidebar */}
        <div className="bp-layout">

          {/* ── Contenido ── */}
          <main>
            {/* Autor y fecha */}
            <div className="bp-meta">
              <div className="bp-avatar">{authorInitials}</div>
              <div>
                <div className="bp-author-name">{authorName}</div>
                <div className="bp-author-date">
                  Publicado el {formatDate(publishDate)} · {p.read_time} min lectura
                </div>
              </div>
            </div>

            {/* Artículo */}
            <article className="bp-content" id="post-content">
              <div className="bp-content-inner">
                {blocks.length === 0 ? (
                  <p style={{ color: '#9a9186', fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 18 }}>
                    Este artículo aún no tiene contenido publicado.
                  </p>
                ) : (
                  pages.map((pageBlocks, pageIdx) => {
                    const visibleBlocks = pageBlocks.filter(b =>
                      b.type === 'divider' ||
                      (b.type === 'image' && b.meta?.src) ||
                      (b.type !== 'image' && typeof b.content === 'string' && b.content.trim())
                    )
                    if (visibleBlocks.length === 0) return null
                    return (
                      <div key={pageIdx}>
                        {pageIdx > 0 && (
                          <div style={{ display:'flex', alignItems:'center', gap:16, margin:'56px 0', opacity:.5 }}>
                            <div style={{ flex:1, height:1, background:'#ddd8cf' }} />
                            <span style={{ color:'#c4783c', fontSize:12, fontWeight:700, fontFamily:'system-ui', letterSpacing:'.08em' }}>· · ·</span>
                            <div style={{ flex:1, height:1, background:'#ddd8cf' }} />
                          </div>
                        )}
                        {visibleBlocks.map((block, i) => (
                          <BlockRenderer key={block.id || i} block={block} index={i} />
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            </article>


          </main>

          {/* ── Sidebar ── */}
          <aside className="bp-sidebar">

            {/* Compartir */}
            <div className="bp-card">
              <div className="bp-card-title">Compartir artículo</div>
              <a href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`}
                target="_blank" rel="noopener" className="share-btn share-x">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.903-5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Compartir en X
              </a>
              <a href={`https://wa.me/?text=${shareTitle}%20${shareUrl}`}
                target="_blank" rel="noopener" className="share-btn share-wa">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Compartir por WhatsApp
              </a>
              <CopyLinkButton url={shareUrl} className="share-btn share-link" />
            </div>

            {/* TOC */}
            {headings.length > 0 && (
              <div className="bp-card">
                <div className="bp-card-title">En este artículo</div>
                {headings.map((h, i) => (
                  <a key={i} href={`#h-${i}`} className="bp-toc-item"
                    style={{ paddingLeft: h.type === 'heading2' ? 20 : 10 }}>
                    {h.content.replace(/<[^>]+>/g, '')}
                  </a>
                ))}
              </div>
            )}

            {/* Autor */}
            <div className="bp-card bp-author-card">
              <div className="bp-author-avatar-lg">{authorInitials}</div>
              <div className="bp-author-card-name">{authorName}</div>
              <p className="bp-author-card-bio">
                Especialista en acompañamiento familiar y terapia ABA. Fundadora de CapyABA.
              </p>
              <a href="/sobre-mi" style={{ display:'inline-block', marginTop:14, padding:'8px 18px', background:'#f2e8dc', color:'#7a4020', borderRadius:100, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                Conocer más sobre mí →
              </a>
            </div>

          </aside>
        </div>

        {/* Artículos relacionados */}
        {related && related.length > 0 && (
          <div className="bp-related">
            <h2 className="bp-related-title">Más artículos</h2>
            <div className="bp-related-grid">
              {related.map((r: any) => {
                const rCover = r.cover_url || ''
                return (
                  <Link key={r.id} href={`/blog/${r.slug}`} className="bp-related-card">
                    {rCover
                      ? <img src={rCover} alt={r.title} className="bp-related-img" />
                      : <div className="bp-related-img" style={{ background: '#f2e8dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📝</div>
                    }
                    <div className="bp-related-body">
                      <div className="bp-related-cat">{r.category}</div>
                      <div className="bp-related-ttl">{r.title}</div>
                      <div className="bp-related-meta">{r.read_time} min · {formatDate(r.published_at)}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar scroll */}
      <Footer />
      <WspBubble msg="Hola Francesca, leí tu blog y tengo una consulta 🦫" />

      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
        var bar = document.getElementById('bp-progress');
        var content = document.getElementById('post-content');
        if (bar && content) {
          window.addEventListener('scroll', function() {
            var rect = content.getBoundingClientRect();
            var total = content.offsetHeight;
            var scrolled = -rect.top + window.innerHeight;
            var pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
            bar.style.width = pct + '%';
          }, { passive: true });
        }
      `}} />
    </>
  )
}
