'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export const WA = '51940428169'
export const wa = (msg = 'Hola Francesca, me gustaría obtener más información sobre tus servicios 🦫') =>
  `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`

export const SOCIAL = {
  whatsapp:  `https://wa.me/51940428169`,
  email:     'mailto:capyaba@gmail.com',
  instagram: 'https://www.instagram.com/capyaba/',
  tiktok:    'https://www.tiktok.com/@capyaba',
  facebook:  'https://www.facebook.com/profile.php?id=61560689756278',
}

const LINKS = [
  { href: '/sobre-mi',         label: 'Sobre mí'         },
  { href: '/servicios',        label: 'Servicios'        },
  { href: '/emprendimientos',  label: 'Emprendimientos'  },
  { href: '/testimonios',      label: 'Testimonios'      },
  { href: '/blog',             label: 'Blog'             },
]

export function Nav() {
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let lastScrollY = 0
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const h = () => {
      const y = window.scrollY
      const goingDown = y > lastScrollY

      if (goingDown && y > 80) {
        // Espera 400ms antes de esconder — no desaparece al tiro
        if (!hideTimer) {
          hideTimer = setTimeout(() => {
            setHidden(true)
            hideTimer = null
          }, 400)
        }
      } else {
        // Al subir: cancela el timer y reaparece de inmediato
        if (hideTimer) {
          clearTimeout(hideTimer)
          hideTimer = null
        }
        setHidden(false)
      }

      lastScrollY = y
    }

    window.addEventListener('scroll', h, { passive: true })
    return () => {
      window.removeEventListener('scroll', h)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0.75rem 1rem',
      transform: hidden ? 'translateY(-110%)' : 'translateY(0)',
      transition: hidden
        ? 'transform 0.55s cubic-bezier(0.4,0,0.2,1)'   /* bajar: suave */
        : 'transform 0.4s cubic-bezier(0.0,0,0.2,1)',   /* subir: un poco más rápido */
    }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(252,248,242,0.98)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 2px 20px rgba(0,0,0,.08)',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,.07)',
        padding: '.65rem 1.6rem',
        maxWidth: 980, margin: '0 auto',
      }}>

        {/* LOGO */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          <Image
            src="/capyaba-mascot.png"
            alt="CapyABA"
            width={72}
            height={103}
            style={{ objectFit: 'contain', display: 'block', marginTop: '-18px', marginBottom: '-18px' }}
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
          className="hide-mobile">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`nav-link ${pathname === href ? 'active' : ''}`}>
              {label}
            </Link>
          ))}
        </div>

        {/* CTA group */}
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }} className="hide-mobile">
          <Link href="/login" className="nav-link" style={{ padding: '.5rem .8rem' }}>Login</Link>
          <a href={wa('Hola Francesca, me gustaría agendar una sesión 🦫')}
            target="_blank" rel="noopener noreferrer"
            className="btn-dark" style={{ padding: '.6rem 1.3rem', fontSize: '.88rem' }}>
            Agendar sesión
          </a>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="show-mobile"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--dark)' }}>
          {open ? '✕' : '☰'}
        </button>

        {/* Mobile dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + .5rem)', left: 0, right: 0,
            background: '#fff', padding: '1.5rem 2rem 2rem',
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            borderRadius: 16, border: '1px solid rgba(0,0,0,.07)',
            display: 'flex', flexDirection: 'column', gap: '1.2rem',
          }}>
            {LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                style={{ fontWeight: 500, textDecoration: 'none', color: 'var(--dark)', fontSize: '1.05rem' }}>
                {label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}
              style={{ fontWeight: 500, textDecoration: 'none', color: 'var(--dark)', fontSize: '1.05rem' }}>
              Login
            </Link>
            <a href={wa()} target="_blank" rel="noopener noreferrer"
              className="btn-wsp" style={{ marginTop: '.5rem', justifyContent: 'center' }}>
              💬 WhatsApp
            </a>
          </div>
        )}
      </nav>
    </div>
  )
}

/* ── WhatsApp floating bubble ── */
export function WspBubble({ msg }: { msg?: string }) {
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
      <div style={{ position: 'relative', width: 58, height: 58 }}>
        <a href={wa(msg)} target="_blank" rel="noopener noreferrer"
          className="wsp-bubble" title="Escríbeme por WhatsApp"
          style={{ position: 'relative', zIndex: 1 }}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
      <style>{`
        @keyframes wspPulse {
          0%   { transform: scale(1);   opacity: .8; }
          100% { transform: scale(2.4); opacity: 0;  }
        }
      `}</style>
    </div>
  )
}

/* ── Footer ── */
const FOOTER_COLS = [
  { title: 'Servicios', links: [
    ['Terapia Infantil', '/servicios#terapia-infantil'],
    ['Sesiones Padres', '/servicios#sesiones-padres'],
    ['Cursos IBT/IBA', '/servicios#cursos'],
    ['Supervisiones', '/servicios#supervisiones'],
  ]},
  { title: 'Proyectos', links: [
    ['SANTI Terapias', '/emprendimientos#santi'],
    ['VANTY ABA', '/emprendimientos#vanty'],
    ['Capyequipo', '/emprendimientos#capyequipo'],
    ['CapyABA', '/emprendimientos#capyaba'],
  ]},
  { title: 'Recursos', links: [
    ['Blog', '/blog'],
    ['Sobre mí', '/sobre-mi'],
    ['Testimonios', '/testimonios'],
  ]},
  { title: 'Contacto', links: [
    ['WhatsApp', `https://wa.me/51940428169`],
    ['capyaba@gmail.com', 'mailto:capyaba@gmail.com'],
    ['Instagram', 'https://www.instagram.com/capyaba/'],
    ['TikTok', 'https://www.tiktok.com/@capyaba'],
    ['Facebook', 'https://www.facebook.com/profile.php?id=61560689756278'],
  ]},
]

export function Footer() {
  return (
    <footer>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Top row — 4 link columns */}
        <div className="footer-cols">
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h5 style={{ fontSize: '.72rem', fontWeight: 600, color: 'rgba(244,236,223,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>{col.title}</h5>
              {col.links.map(([label, href]) => (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined}
                  style={{ display: 'block', padding: '5px 0', fontSize: '.92rem', color: 'rgba(244,236,223,.7)', textDecoration: 'none', transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--cream)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(244,236,223,.7)')}>
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom row — logo grande + copyright + redes */}
        <div style={{ paddingTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <Link href="/" style={{ display: 'inline-block', marginBottom: '.8rem' }}>
              <Image
                src="/capyaba-mascot.png"
                alt="CapyABA"
                width={75}
                height={107}
                style={{ objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)', opacity: .85 }}
              />
            </Link>
            <p style={{ fontSize: '.8rem', color: 'rgba(244,236,223,.35)', marginTop: '.3rem' }}>
              © 2026 CapyABA · Francesca Ramírez Bontá · Hecho con 💛 desde Perú
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', paddingBottom: '.2rem' }}>
            {[
              ['Instagram', 'https://www.instagram.com/capyaba/'],
              ['TikTok',    'https://www.tiktok.com/@capyaba'],
              ['Facebook',  'https://www.facebook.com/profile.php?id=61560689756278'],
            ].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '.85rem', color: 'rgba(244,236,223,.45)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--cream)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(244,236,223,.45)')}>
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}

/* ── Reveal hook helper (client-side only) ── */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}
