'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Nav, Footer, WspBubble, useReveal } from '@/components/shared'

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string
  cover_url: string | null
  cover_emoji: string
  cover_bg: string
  category: string
  author_name: string
  author_initials: string
  read_time: number
  published_at: string
}

const CATS = ['Todos', 'Para familias', 'Formación', 'Casos clínicos', 'Divulgación']

const CAT_COLORS: Record<string, { bg: string; fg: string }> = {
  'Para familias': { bg: '#F2C8B6', fg: '#5C2A14' },
  'Formación':     { bg: '#D4E0C5', fg: '#2A4A18' },
  'Casos clínicos':{ bg: '#E8DCC2', fg: '#4A3618' },
  'Divulgación':   { bg: '#F5DFD3', fg: '#5C2E20' },
}

const CAT_ICONS: Record<string, string> = {
  'Para familias': '🏠',
  'Formación': '📚',
  'Casos clínicos': '🔬',
  'Divulgación': '🧠',
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CategoryPill({ cat, small }: { cat: string; small?: boolean }) {
  const c = CAT_COLORS[cat] || { bg: '#E8DCC2', fg: '#4A3618' }
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg,
      color: c.fg,
      padding: small ? '3px 10px' : '4px 12px',
      borderRadius: 100,
      fontSize: small ? '.68rem' : '.72rem',
      fontWeight: 700,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
    }}>
      {cat}
    </span>
  )
}

function PostCover({ post, size = 'grid' }: { post: Post; size?: 'featured' | 'grid' }) {
  if (post.cover_url) {
    return (
      <img
        src={post.cover_url}
        alt={post.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )
  }
  return (
    <div style={{
      width: '100%', height: '100%',
      background: post.cover_bg || '#F2C8B6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size === 'featured' ? '5rem' : '3rem',
    }}>
      {post.cover_emoji || '📝'}
    </div>
  )
}

export default function BlogClient({ posts }: { posts: Post[] }) {
  useReveal()
  const [cat, setCat] = useState('Todos')
  const [search, setSearch] = useState('')

  const featured = posts[0] || null
  const rest = posts.slice(1)

  const filtered = rest.filter(p =>
    (cat === 'Todos' || p.category === cat) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) ||
     p.excerpt?.toLowerCase().includes(search.toLowerCase()))
  )

  const counts = CATS.slice(1).reduce((acc, c) => {
    acc[c] = posts.filter(p => p.category === c).length
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <Nav />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--cream)',
        padding: '6rem 3rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute',
          bottom: '-0.05em',
          right: '-0.04em',
          fontSize: 'clamp(8rem, 18vw, 22rem)',
          fontFamily: "'Fraunces', serif",
          fontWeight: 300,
          color: 'rgba(31,23,16,0.04)',
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-.04em',
        }}>Blog</div>

        <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(31,23,16,0.06)', borderRadius: 100,
            padding: '6px 16px 6px 10px', marginBottom: '1.5rem',
          }}>
            <span style={{ fontSize: '1rem' }}>🧠</span>
            <span style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Divulgación científica
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            fontWeight: 300,
            lineHeight: 1.08,
            letterSpacing: '-.03em',
            color: 'var(--dark)',
            marginBottom: '1.5rem',
          }}>
            Ciencia del comportamiento{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>sin complicaciones</em>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
            color: 'var(--muted)',
            lineHeight: 1.7,
            maxWidth: 580,
          }}>
            Artículos, guías y recursos para familias, estudiantes y profesionales que quieren entender cómo funciona el aprendizaje humano.
          </p>
        </div>
      </section>

      {/* ── FEATURED ────────────────────────────────────────── */}
      {featured && (
        <section className="section-pad-sm" style={{ paddingTop: 0, background: 'var(--cream)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Link
              href={`/blog/${featured.slug}`}
              className="reveal blog-featured-card"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderRadius: 28,
                overflow: 'hidden',
                background: 'var(--dark)',
                textDecoration: 'none',
                color: 'inherit',
                minHeight: 460,
                boxShadow: '0 32px 80px rgba(31,23,16,0.18)',
                transition: 'transform .35s, box-shadow .35s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 48px 100px rgba(31,23,16,0.24)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 32px 80px rgba(31,23,16,0.18)'
              }}
            >
              <div style={{ position: 'relative', overflow: 'hidden', minHeight: 320 }}>
                <PostCover post={featured} size="featured" />
              </div>

              <div style={{
                padding: 'clamp(2rem,4vw,3.5rem)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '1.2rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em',
                    textTransform: 'uppercase', padding: '4px 12px', borderRadius: 100,
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}>✦ Destacado</span>
                  <CategoryPill cat={featured.category} small />
                </div>

                <h2 style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 'clamp(1.8rem, 2.8vw, 2.5rem)',
                  fontWeight: 400,
                  letterSpacing: '-.025em',
                  lineHeight: 1.15,
                  color: '#fff',
                }}>
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p style={{
                    fontSize: '.95rem',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.65,
                  }}>
                    {featured.excerpt}
                  </p>
                )}

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '1.2rem', marginTop: '.2rem',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.72rem', fontWeight: 700, color: '#fff',
                  }}>
                    {featured.author_initials}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '.82rem', fontWeight: 600, color: '#fff' }}>
                      {featured.author_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      {featured.read_time} min · {formatDate(featured.published_at)}
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '.82rem', fontWeight: 600,
                      padding: '8px 18px', borderRadius: 100,
                    }}>
                      Leer →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── FILTERS + GRID ──────────────────────────────────── */}
      <section style={{ background: '#EADFCC', padding: '4rem 3rem 8rem' }} data-blog-grid>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          <div className="reveal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.5rem' }}>
                Todos los artículos
              </div>
              <h2 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                fontWeight: 400,
                letterSpacing: '-.025em',
                lineHeight: 1.1,
                color: 'var(--dark)',
              }}>
                Explora el <em style={{ fontStyle: 'italic' }}>archivo</em>
              </h2>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '.9rem', pointerEvents: 'none' }}>🔍</span>
              <input
                type="search"
                placeholder="Buscar artículo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '.65rem 1.2rem .65rem 2.4rem',
                  border: '1.5px solid rgba(31,23,16,0.15)',
                  borderRadius: 100,
                  background: 'var(--cream)',
                  color: 'var(--dark)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '.88rem',
                  minWidth: 220,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div className="reveal" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: '.55rem 1.1rem',
                  borderRadius: 100,
                  fontSize: '.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1.5px solid ${cat === c ? 'var(--dark)' : 'rgba(31,23,16,0.15)'}`,
                  background: cat === c ? 'var(--dark)' : 'transparent',
                  color: cat === c ? 'var(--cream)' : 'var(--muted)',
                  transition: 'all .18s',
                  letterSpacing: '.01em',
                }}
              >
                {c}{c !== 'Todos' && counts[c] > 0 && (
                  <span style={{ marginLeft: 5, fontSize: '.7rem', opacity: cat === c ? 0.6 : 0.5 }}>
                    ({counts[c]})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
            {filtered.map((p, i) => (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                  style={{
                  background: 'var(--cream)',
                  borderRadius: 20,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform .3s, box-shadow .3s',
                  border: '1px solid rgba(31,23,16,0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.boxShadow = '0 24px 60px rgba(31,23,16,0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
                  <PostCover post={p} size="grid" />
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <CategoryPill cat={p.category} small />
                  </div>
                </div>

                <div style={{ padding: '1.4rem 1.5rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  <h3 style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: '1.22rem',
                    fontWeight: 400,
                    lineHeight: 1.25,
                    letterSpacing: '-.015em',
                    color: 'var(--dark)',
                  }}>
                    {p.title}
                  </h3>

                  {p.excerpt && (
                    <p style={{
                      fontSize: '.87rem',
                      color: 'var(--muted)',
                      lineHeight: 1.6,
                      flex: 1,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    } as any}>
                      {p.excerpt}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: '.75rem',
                    borderTop: '1px solid rgba(31,23,16,0.08)',
                    fontSize: '.77rem',
                    color: 'var(--muted)',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'var(--dark)', color: 'var(--cream)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.63rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {p.author_initials}
                    </div>
                    <span>{p.read_time} min · {formatDate(p.published_at)}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--dark)', opacity: .45 }}>
                      Leer →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p>{posts.length === 0 ? 'Aún no hay artículos publicados.' : 'No se encontraron artículos.'}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CATEGORY CARDS ──────────────────────────────────── */}
      <section style={{ background: 'var(--cream)', padding: '6rem 3rem 8rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.6rem' }}>
              Navega por tema
            </div>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              fontWeight: 400,
              letterSpacing: '-.025em',
              color: 'var(--dark)',
            }}>
              Encuentra lo que <em style={{ fontStyle: 'italic' }}>necesitas</em>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}>
            {Object.entries(CAT_COLORS).map(([name, colors], i) => (
              <button
                key={name}
                onClick={() => {
                  setCat(name)
                  document.querySelector('[data-blog-grid]')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="reveal"
                style={{
                  borderRadius: 20,
                  padding: '2rem 1.8rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 200,
                  background: colors.bg,
                  transition: 'transform .28s, box-shadow .28s',
                  transitionDelay: `${i * .07}s`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.boxShadow = '0 20px 50px rgba(31,23,16,0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <span aria-hidden style={{
                  position: 'absolute', right: 14, bottom: 6,
                  fontSize: '4.5rem', opacity: .12, pointerEvents: 'none',
                }}>
                  {CAT_ICONS[name]}
                </span>

                <div>
                  <div style={{ fontSize: '1.8rem', marginBottom: '.8rem' }}>{CAT_ICONS[name]}</div>
                  <h4 style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: '1.4rem',
                    fontWeight: 400,
                    letterSpacing: '-.015em',
                    color: colors.fg,
                    lineHeight: 1.2,
                  }}>
                    {name}
                  </h4>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: '1.5rem',
                }}>
                  <span style={{ fontSize: '.78rem', fontWeight: 600, color: colors.fg, opacity: .6 }}>
                    {counts[name] || 0} artículos
                  </span>
                  <span style={{
                    fontSize: '.75rem', fontWeight: 700, color: colors.fg,
                    background: `${colors.fg}18`, padding: '4px 10px', borderRadius: 100,
                  }}>
                    Ver →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WspBubble msg="Hola Francesca, leí tu blog y tengo una consulta 🦫" />
    </>
  )
}
