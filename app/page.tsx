'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Nav, Footer, WspBubble, wa, useReveal } from '@/components/shared'

/*
 * ── Maven HeroLines — comportamiento EXACTO ──
 *
 * Maven hace esto:
 * 1. Todas las líneas están siempre visibles pero solo como "stub" corto (~20% del camino)
 * 2. Cuando una línea se activa, SE DIBUJA en vivo desde ese 20% hasta el ~55%
 * 3. Al llegar al final, aparece el dot y el label pill
 * 4. Después de unos segundos, retrocede al stub original
 * 5. Cicla a la siguiente línea
 *
 * Implementación: usamos stroke-dasharray/dashoffset para controlar cuánto
 * de la línea se ve. dashLen = longitud total del path.
 * stub  = dashoffset que muestra solo ~20%  → dashoffset = dashLen * 0.80
 * full  = dashoffset = 0 (línea completa)
 */

const LABEL_LINES = [
  {
    d: 'M-10,62 C100,58 240,42 400,36 C520,31 650,37 800,40',
    endX: 800, endY: 40,
    color: 'rgba(111,207,151,0.85)', dotColor: '#6FCF97',
    label: 'ANÁLISIS CONDUCTUAL APLICADO',
    dashLen: 820,
  },
  {
    d: 'M-10,88 C110,92 240,100 390,92 C520,85 660,78 800,82',
    endX: 800, endY: 82,
    color: 'rgba(245,215,142,0.80)', dotColor: '#F5D78E',
    label: 'CERTIFICADA IBAO · IBA / IBT',
    dashLen: 815,
  },
  {
    d: 'M-10,118 C120,122 260,132 410,138 C540,143 670,135 800,128',
    endX: 800, endY: 128,
    color: 'rgba(196,176,236,0.72)', dotColor: '#C4B0EC',
    label: 'SUPERVISIÓN PROFESIONAL',
    dashLen: 825,
  },
]

// Longitud del "stub" inicial = lo que se ve cuando la línea está inactiva
// dashoffset = dashLen - stubLen  →  solo se ven los primeros stubLen px
const STUB_LEN = 175  // ~20% de 820

function HeroLines() {
  const [active, setActive]   = useState<number>(-1)
  const [phase,  setPhase]    = useState<'idle' | 'drawing' | 'show' | 'retracting'>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms); timers.current.push(t)
  }

  const cycle = (idx: number) => {
    setActive(idx)
    setPhase('drawing')                          // línea se extiende stub → full
    after(950,  () => setPhase('show'))          // llegó al final → dot + label aparecen
    after(3600, () => setPhase('retracting'))    // label desaparece, línea retrocede
    after(4500, () => { setActive(-1); setPhase('idle') })
    after(4900, () => cycle((idx + 1) % LABEL_LINES.length))
  }

  useEffect(() => {
    after(600, () => cycle(0))
    return clear
  }, [])

  /**
   * Calcula el dashoffset de cada línea:
   * - inactiva: muestra solo STUB_LEN px desde el inicio
   * - drawing:  transiciona de stub → 0 (línea completa)
   * - show:     offset 0 (completa)
   * - retracting: transiciona de 0 → stub
   */
  const lineStyle = (i: number): React.CSSProperties => {
    const dl = LABEL_LINES[i].dashLen
    const stubOffset = dl - STUB_LEN  // offset para mostrar solo el stub

    if (active !== i) {
      // inactiva: stub fijo, sin transición
      return {
        strokeDasharray: dl,
        strokeDashoffset: stubOffset,
        opacity: 0.55,
        transition: 'none',
      }
    }
    if (phase === 'drawing') {
      return {
        strokeDasharray: dl,
        strokeDashoffset: 0,
        opacity: 1,
        transition: 'stroke-dashoffset 0.92s cubic-bezier(0.4,0,0.2,1), opacity 0.3s',
      }
    }
    if (phase === 'show') {
      return {
        strokeDasharray: dl,
        strokeDashoffset: 0,
        opacity: 1,
      }
    }
    if (phase === 'retracting') {
      return {
        strokeDasharray: dl,
        strokeDashoffset: stubOffset,
        opacity: 0.55,
        transition: 'stroke-dashoffset 0.75s cubic-bezier(0.4,0,0.6,1) 0.15s, opacity 0.5s 0.2s',
      }
    }
    return { strokeDasharray: dl, strokeDashoffset: stubOffset, opacity: 0.55 }
  }

  const dotStyle = (i: number): React.CSSProperties => {
    const visible = active === i && (phase === 'show' || phase === 'retracting')
    return {
      opacity: visible ? 1 : 0,
      transform: active === i && phase === 'show' ? 'scale(1)' : 'scale(0.2)',
      transformOrigin: `${LABEL_LINES[i].endX}px ${LABEL_LINES[i].endY}px`,
      transition: visible
        ? 'opacity 0.25s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
        : 'opacity 0.3s 0.1s, transform 0.25s',
    }
  }

  const labelStyle = (i: number): React.CSSProperties => ({
    opacity: active === i && phase === 'show' ? 1 : 0,
    transition: active === i && phase === 'show'
      ? 'opacity 0.35s 0.25s'
      : 'opacity 0.2s',
  })

  return (
    <svg
      viewBox="0 0 840 175"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        bottom: '2%', left: 0,
        width: '60%',
        height: 'auto',
        minHeight: 145,
        zIndex: 2,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {LABEL_LINES.map((l, i) => (
        <g key={i}>
          {/* Línea — stub cuando inactiva, se extiende cuando activa */}
          <path
            d={l.d}
            stroke={l.color}
            strokeWidth={1.4}
            fill="none"
            style={lineStyle(i)}
          />

          {/* Dot — aparece exactamente en el extremo final */}
          <circle
            cx={l.endX} cy={l.endY} r={3.8}
            fill={l.dotColor}
            style={dotStyle(i)}
          />

          {/* Label pill con foreignObject para auto-ancho */}
          <foreignObject
            x={l.endX + 10} y={l.endY - 14}
            width="340" height="30"
            style={{ overflow: 'visible', ...labelStyle(i) }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(12,20,16,0.78)',
                backdropFilter: 'blur(6px)',
                borderRadius: 20,
                padding: '4px 11px 4px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: l.dotColor, flexShrink: 0,
                display: 'inline-block',
              }} />
              <span style={{
                fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                fontSize: 9, fontWeight: 700,
                letterSpacing: '1.4px',
                color: l.dotColor,
              }}>
                {l.label}
              </span>
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  )
}


/* ── Maven-style hover-to-expand service cards ── */
const SERVICES = [
  {
    id: 'terapia-infantil',
    title: 'Terapia Infantil',
    desc: 'Sesiones ABA para potenciar habilidades comunicativas, sociales y adaptativas en cada niño.',
    dot: '#6FCF97',
    img: '/terapia-infantil.png',
    wsp: 'Hola Francesca, me interesa la Terapia Infantil ABA para mi hijo/a 🧒',
    href: '/servicios#terapia-infantil',
  },
  {
    id: 'sesiones-padres',
    title: 'Sesiones para Padres',
    desc: 'Capacitación a familias para convertirse en agentes de cambio en el hogar.',
    dot: '#F5D78E',
    img: '/sesiones-padres.png',
    wsp: 'Hola Francesca, quisiera información sobre las Sesiones para Padres 👨‍👩‍👧',
    href: '/servicios#sesiones-padres',
  },
  {
    id: 'cursos',
    title: 'Cursos IBT & IBA',
    desc: 'Formación teórica aprobada por la IBAO, con estándares internacionales.',
    dot: '#C4B0EC',
    img: '/cursos-ibt.png',
    wsp: 'Hola Francesca, me interesa información sobre los Cursos IBT/IBA 📚',
    href: '/servicios#cursos',
  },
  {
    id: 'supervisiones',
    title: 'Supervisiones IBT & IBA',
    desc: 'Retroalimentación personalizada y análisis de casos para candidatos en formación.',
    dot: '#4ecdc4',
    img: '/supervisiones.png',
    wsp: 'Hola Francesca, quisiera información sobre las Supervisiones IBT/IBA 🔬',
    href: '/servicios#supervisiones',
  },
]

const STATS = [
  { num: '500+', label: 'Familias acompañadas en procesos terapéuticos.' },
  { num: '100%', label: 'Intervenciones basadas en evidencia científica.' },
  { num: '4',    label: 'Emprendimientos activos en el ecosistema ABA.' },
  { num: 'IBA·IBT', label: 'Doble certificación IBAO internacional.' },
]

const AUDIENCES = [
  { label: 'Familias',       bg: '#F2C8B6', emoji: '🏠' },
  { label: 'Estudiantes',    bg: '#D4E0C5', emoji: '🎓' },
  { label: 'Profesionales',  bg: '#F5DFD3', emoji: '💼' },
  { label: 'Instituciones',  bg: '#E8DCC2', emoji: '🏫' },
]

const serviceCardStyles = `
  .svc-section {
    background: #F4ECDF;
    padding: 0 2rem 7rem;
  }
  .svc-grid {
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    height: clamp(500px, 65vh, 660px);
    box-sizing: border-box;
  }
  .svc-card {
    border-radius: 18px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background: #c8bfb0;
    flex: 1;
    min-width: 0;
    transition: flex 1.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .svc-card:hover {
    flex: 3.4;
  }
  .svc-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    transform: scale(1);
    transition: transform 1.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .svc-card:hover .svc-img {
    transform: scale(1.05);
  }
  .svc-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(8,6,3,0.82) 0%,
      rgba(8,6,3,0.28) 45%,
      rgba(8,6,3,0.0) 100%
    );
    transition: background 1.5s ease;
    z-index: 1;
  }
  .svc-card:hover .svc-overlay {
    background: linear-gradient(
      to top,
      rgba(8,6,3,0.93) 0%,
      rgba(8,6,3,0.55) 50%,
      rgba(8,6,3,0.06) 100%
    );
  }
  .svc-dot {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 3;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    transition: box-shadow 1.0s ease;
  }
  .svc-card:hover .svc-dot {
    box-shadow: 0 0 0 4px rgba(255,255,255,0.18);
  }
  .svc-bottom {
    position: relative;
    z-index: 2;
    padding: 0 1.5rem 1.8rem;
    max-width: 320px;
  }
  .svc-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.3rem;
    font-weight: 400;
    color: #fff;
    line-height: 1.2;
    margin: 0;
    letter-spacing: -.015em;
    transition: font-size 1.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .svc-card:hover .svc-title {
    font-size: 1.65rem;
  }
  .svc-reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition:
      grid-template-rows 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s,
      opacity 0.2s ease 0s;
  }
  .svc-reveal-inner {
    overflow: hidden;
  }
  .svc-card:hover .svc-reveal {
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
      grid-template-rows 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s,
      opacity 1.0s ease 0.65s;
  }
  .svc-desc {
    margin-top: 0.8rem;
    margin-bottom: 1.2rem;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 0.9rem;
    color: rgba(255,255,255,0.86);
    line-height: 1.65;
    max-width: 260px;
  }
  .svc-cta {
    display: inline-block;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 0.88rem;
    font-weight: 700;
    padding: 0.65rem 1.4rem;
    border-radius: 10px;
    text-decoration: none;
    letter-spacing: 0.01em;
    color: #1F1710;
  }

  /* ── Mobile: stack cards vertically ── */
  @media (max-width: 768px) {
    .svc-section { padding: 0 0.75rem 4rem; }
    .svc-grid {
      flex-direction: column;
      height: auto;
      gap: 0.75rem;
    }
    .svc-card {
      min-height: 220px;
      flex: none;
    }
    .svc-card:hover { flex: none; }
    .svc-title { font-size: 1.45rem; }
    .svc-card:hover .svc-title { font-size: 1.45rem; }
    /* Always show description on mobile (no hover) */
    .svc-reveal {
      grid-template-rows: 1fr;
      opacity: 1;
    }
    .svc-bottom { padding: 0 1.25rem 1.5rem; }
  }
`

function ServiceCards() {
  return (
    <section className="svc-section">
      <style suppressHydrationWarning>{serviceCardStyles}</style>
      <div className="svc-grid">
        {SERVICES.map((s) => (
          <div key={s.id} className="svc-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt={s.title} className="svc-img" />
            <div className="svc-overlay" />
            <div className="svc-dot" style={{ background: s.dot }} />

            {/* Bottom content — always visible title + reveal on hover */}
            <div className="svc-bottom">
              <h3 className="svc-title">{s.title}</h3>
              <div className="svc-reveal">
                <div className="svc-reveal-inner">
                  <p className="svc-desc">{s.desc}</p>
                  <Link href={s.href} className="svc-cta" style={{ background: s.dot }}>
                    Conocer más
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Page ── */
export default function Home() {
  useReveal()

  return (
    <>
      <Nav />

      {/* ══ HERO — Maven-style: fondo oscuro + card flotante con border-radius ══ */}
      <section style={{
        background: '#F4ECDF',
        padding: '44px 1.25rem 1.25rem',
        minHeight: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ── CARD flotante con bordes redondeados, igual que Maven ── */}
        <div className="hero-card">

          {/* Imagen de fondo DENTRO del card */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/francesca-hero.png"
            alt="Francesca Ramírez"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: '65% top',
              zIndex: 0,
            }}
          />

          {/* Overlay gradiente — izquierda oscura, derecha transparente */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to right, rgba(31,23,16,.92) 0%, rgba(31,23,16,.80) 32%, rgba(31,23,16,.25) 60%, rgba(31,23,16,0) 100%)',
          }} />

          <span className="hero-lines">
            <HeroLines />
          </span>

          {/* Hero text — sobre el card */}
          <div className="hero-text">
            <div style={{ fontSize:'.78rem', fontWeight:600, color:'rgba(244,236,223,.6)',
              marginBottom:'1.1rem', letterSpacing:'.06em', textTransform:'uppercase',
              animation:'fadeUp .7s .3s ease both', opacity:0 }}>
              — Francesca Ramírez Bontá
            </div>

            <h1 style={{
              fontFamily: "'Fraunces','Georgia',serif",
              fontSize: 'clamp(2.9rem,5.8vw,5.4rem)',
              fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.05,
              color: '#fff', maxWidth: 700, marginBottom: '1.6rem',
              animation: 'fadeUp .8s .45s ease both', opacity:0,
            }}>
              Análisis conductual{' '}
              <em style={{ fontStyle:'italic', fontWeight:300, letterSpacing:'-.015em' }}>basado en evidencia</em>
              {' '}para <strong style={{ fontWeight:500 }}>niños y familias</strong>
            </h1>

            <p style={{
              fontSize: '1.1rem', color: 'rgba(244,236,223,.75)', lineHeight: 1.58,
              maxWidth: 480, marginBottom: '2.2rem',
              animation: 'fadeUp .8s .6s ease both', opacity:0,
            }}>
              Terapia ABA, formación IBT/IBA y supervisiones profesionales.
              Ciencia rigurosa con calidez humana.
            </p>

            <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap',
              animation:'fadeUp .8s .75s ease both', opacity:0 }}>
              <Link href="/servicios" className="btn-cream">
                Explorar servicios
              </Link>
              <a href={wa('Hola Francesca, me gustaría agendar una sesión 🦫')}
                target="_blank" rel="noopener noreferrer"
                className="btn-wsp">
                💬 Escribirme
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INTRO BANNER ══ */}
      <section className="landing-intro">
        {/* Arcos decorativos estilo Maven — curvas grandes que atraviesan toda la sección */}
        <svg
          viewBox="0 0 1440 520"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {/* Arco 1 — curva amplia desde abajo-izquierda hasta arriba-derecha */}
          <path
            d="M -100 600 Q 400 -80 1540 200"
            stroke="rgba(31,23,16,0.07)" strokeWidth="1.5" fill="none"
          />
          {/* Arco 2 — paralelo, desplazado */}
          <path
            d="M -100 720 Q 380 20 1540 320"
            stroke="rgba(31,23,16,0.06)" strokeWidth="1.3" fill="none"
          />
          {/* Arco 3 — más centrado */}
          <path
            d="M -100 460 Q 500 -120 1540 80"
            stroke="rgba(31,23,16,0.055)" strokeWidth="1.2" fill="none"
          />
          {/* Arco 4 — desde la derecha */}
          <path
            d="M 1540 600 Q 900 -60 -100 300"
            stroke="rgba(31,23,16,0.05)" strokeWidth="1.1" fill="none"
          />
          {/* Arco 5 — más tenue */}
          <path
            d="M 1540 780 Q 850 80 -100 460"
            stroke="rgba(31,23,16,0.04)" strokeWidth="1" fill="none"
          />
        </svg>
        <div className="reveal" style={{ maxWidth:780, margin:'0 auto', position: 'relative', zIndex: 1 }}>
          <h2 className="section-title" style={{ marginBottom:'1.3rem' }}>
            La plataforma de análisis conductual que{' '}
            <strong>transforma vidas</strong>
          </h2>
          <p style={{ fontSize:'1.15rem', color:'var(--muted)', lineHeight:1.55, maxWidth:680, margin:'0 auto 2.5rem' }}>
            Acompañando a familias, estudiantes y profesionales con intervenciones
            validadas, personalizadas y alineadas con los estándares de la IBAO.
          </p>
          <div style={{ display:'flex', gap:'.75rem', justifyContent:'center', flexWrap:'wrap' }}>
            <a href={wa('Hola Francesca, quisiera agendar una consulta 🦫')}
              target="_blank" rel="noopener noreferrer" className="btn-wsp">
              💬 Agendar por WhatsApp
            </a>
            <Link href="/servicios" className="btn-outline">Conocer servicios</Link>
          </div>
        </div>
      </section>

      {/* ══ SERVICES — Maven expanding grid ══ */}
      <ServiceCards />

      {/* ══ ABOUT TEASER ══ */}
      <section className="dark-section" style={{ padding:'0', overflow:'hidden' }}>
        <div className="about-grid">
          <div className="reveal about-text">
            <div className="eyebrow" style={{ color:'#F5D78E' }}>¿QUIÉN SOY?</div>
            <h2 className="section-title" style={{ color:'#F4ECDF', marginBottom:'1.8rem' }}>
              Soy <strong>capyABA</strong>,{' '}
              <em>psicóloga y neuropsicóloga</em>.
            </h2>
            <p style={{ fontSize:'1.1rem', color:'rgba(244,236,223,.72)', lineHeight:1.6, marginBottom:'1rem' }}>
              Especialista en terapia infantil, certificada como IBA y IBT por la IBAO.
              Apasionada por la actividad científica y comprometida con la divulgación.
            </p>
            <p style={{ fontSize:'1.1rem', color:'rgba(244,236,223,.72)', lineHeight:1.6, marginBottom:'2rem' }}>
              Busco que el conocimiento llegue de manera clara y práctica para ayudar
              a las personas en su vida cotidiana.
            </p>
            <Link href="/sobre-mi" className="btn-cream">
              Conoce mi historia →
            </Link>
          </div>
          <div className="reveal about-img" style={{ animationDelay:'.15s' }}>
            <div style={{
              aspectRatio:'4/5', borderRadius:40, overflow:'hidden',
              boxShadow:'0 40px 80px rgba(0,0,0,.35)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/francesca-about.png"
                alt="Francesca Ramírez Bontá"
                style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', display:'block' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="landing-stats-section">
        <div style={{ maxWidth:1400, margin:'0 auto' }}>
          <div className="reveal" style={{ maxWidth:900, marginBottom:'4rem' }}>
            <h2 className="section-title" style={{ marginBottom:'1.2rem' }}>
              Mejorando vidas a través del <strong>análisis conductual</strong>
            </h2>
            <p style={{ fontSize:'1.1rem', color:'var(--muted)', lineHeight:1.5 }}>
              Guiando a familias, estudiantes y profesionales hacia rutas de desarrollo más claras.
            </p>
          </div>
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <div key={s.num} className="reveal"
                style={{ paddingTop:'2rem', borderTop:'1px solid rgba(31,23,16,.15)',
                  transitionDelay:`${i*.1}s` }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(2.6rem,4.5vw,4.5rem)',
                  fontWeight:300, letterSpacing:'-.035em', lineHeight:1, marginBottom:'1.2rem' }}>
                  {s.num}
                </div>
                <div style={{ fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", fontSize:'1rem',
                  fontWeight:500, lineHeight:1.4, letterSpacing:'-.01em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section id="contacto" className="landing-cta-section">
        <div className="reveal">
          <h2 className="section-title" style={{ maxWidth:860, margin:'0 auto 3rem',
            fontSize:'clamp(2.8rem,5.5vw,5rem)' }}>
            Lleva tu familia o carrera al <strong>siguiente nivel</strong>
          </h2>
          <div style={{ display:'flex', gap:'.75rem', justifyContent:'center', flexWrap:'wrap' }}>
            <a href={wa('Hola Francesca, quiero empezar. ¿Por dónde comenzamos? 🦫')}
              target="_blank" rel="noopener noreferrer" className="btn-wsp">
              💬 Escribirme por WhatsApp
            </a>
            <Link href="/servicios" className="btn-outline">Ver todos los servicios</Link>
          </div>
        </div>
      </section>

      <Footer />
      <WspBubble msg="Hola Francesca, vi tu página y me gustaría obtener más información 🦫" />
    </>
  )
}
