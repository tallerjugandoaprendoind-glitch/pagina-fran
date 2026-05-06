'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Nav, Footer, WspBubble, wa, useReveal } from '@/components/shared'

const SERVICES = [
  { id:'terapia-infantil', num:'01', title:'Terapia Infantil ABA', bg:'#F2C8B6', img:'/terapia-infantil.png',
    desc:'Sesiones diseñadas para potenciar el desarrollo de habilidades comunicativas, sociales y adaptativas. Cada intervención se adapta a las necesidades individuales del niño y su familia.',
    features:['Evaluación inicial completa del repertorio conductual','Plan de intervención personalizado con objetivos medibles','Sesiones con enfoque lúdico que respetan el ritmo del niño','Reportes de progreso con datos objetivos y seguimiento'],
    wsp:'Hola Francesca, me interesa la Terapia Infantil ABA 🧒',
  },
  { id:'sesiones-padres', num:'02', title:'Sesiones para Padres', bg:'#D4E0C5', img:'/sesiones-padres.png',
    desc:'Acompaño y capacito a los padres para que se conviertan en los principales agentes de cambio en casa, aplicando estrategias conductuales efectivas y seguras.',
    features:['Entrenamiento en estrategias ABA adaptadas al hogar','Herramientas para manejo conductual cotidiano','Seguimiento continuo con ajustes según avances','Empoderamiento familiar basado en evidencia'],
    wsp:'Hola Francesca, quisiera Sesiones para Padres 👨‍👩‍👧',
  },
  { id:'cursos', num:'03', title:'Cursos IBT & IBA', bg:'#F5DFD3', img:'/cursos-ibt.png',
    desc:'Cursos de formación teórica aprobados por la IBAO, dirigidos a quienes buscan certificarse como IBT o IBA.',
    features:['Contenidos aprobados por la IBAO, actualizados constantemente','Material didáctico con casos reales y ejercicios prácticos','Preparación integral para el examen de certificación','Modalidad online flexible con plataforma propia'],
    wsp:'Hola Francesca, me interesan los Cursos IBT/IBA 📚',
  },
  { id:'supervisiones', num:'04', title:'Supervisiones IBT & IBA', bg:'#E8DCC2', img:'/supervisiones.png',
    desc:'Supervisiones para candidatos IBT e IBA con retroalimentación personalizada, análisis de casos y guía práctica.',
    features:['Análisis de casos reales traídos por el supervisado','Retroalimentación personalizada con foco en mejora','Guía ética y técnica alineada con estándares IBAO','Certificación de horas válidas para el proceso IBAO'],
    wsp:'Hola Francesca, quisiera Supervisiones IBT/IBA 🔬',
  },
]

const PROCESS = [
  { num:'01', title:'Contacto inicial', desc:'Me escribes contándome tu caso. Respondo en menos de 24 horas hábiles.' },
  { num:'02', title:'Evaluación', desc:'Sesión inicial para entender necesidades y diseñar un plan personalizado.' },
  { num:'03', title:'Intervención', desc:'Inicio del proceso con seguimiento constante y ajustes según resultados.' },
  { num:'04', title:'Cierre y seguimiento', desc:'Evaluación de objetivos alcanzados y plan de seguimiento a largo plazo.' },
]

const FAQS = [
  { q:'¿Las sesiones son presenciales u online?', a:'En el caso de intervención directamente con el niño sería presencial. Las demás son online; mientras que las sesiones con padres pueden ser presenciales u online dependiendo de su propia preferencia.' },
  { q:'¿Qué diferencia hay entre IBT e IBA?', a:'IBT es el primer nivel que te certifica para intervenir desde ABA, IBA es el grado superior que supervisa y diseña programas. Actualmente cuento con ambas certificaciones y una amplia experiencia clínica.' },
  { q:'¿Cuánto dura una intervención típica?', a:'Entre 6 meses a más, dependiendo de los resultados de mi primera entrevista contigo así como de una evaluación en caso te lo solicite. No te preocupes que tendrás acceso a los gráficos y la data a tiempo real del progreso de tu menor hijo(a)' },
  { q:'¿A qué países atiendes?', a:'¡Busco ayudar a todo el mundo! Así que desde donde estés, puedes comunicarte conmigo y con gusto te ayudaré.' },
]

function FAQ({ q, a }: { q:string; a:string }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} style={{ borderTop:'1px solid var(--border)', padding:'1.8rem 0', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem' }}>
        <span style={{ fontFamily:"'Fraunces',serif", fontSize:'1.3rem', fontWeight:500, letterSpacing:'-.015em' }}>{q}</span>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'#1F1710', color:'#F4ECDF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', transition:'transform .3s', transform:open?'rotate(45deg)':'none', flexShrink:0 }}>+</div>
      </div>
      <div style={{ maxHeight:open?400:0, overflow:'hidden', transition:'max-height .4s ease', color:'var(--muted)', lineHeight:1.6, paddingTop:open?'1rem':0 }}>
        {a}
      </div>
    </div>
  )
}

export default function Servicios() {
  useReveal()
  return (
    <>
      <Nav />
      <section className="page-header">
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="eyebrow">Nuestros Servicios</div>
          <h1>Todo lo que <strong>necesitas</strong>, basado en ciencia</h1>
          <p>Cuatro formas de acompañarte — terapia, sesiones para padres, formación y supervisiones — alineadas con los estándares IBAO.</p>
        </div>
      </section>

      {SERVICES.map((s, i) => {
        const even = i % 2 === 1
        return (
          <section key={s.id} id={s.id} className="section-pad" style={{ background:even?'#EADFCC':'#F4ECDF', scrollMarginTop:80 }}>
            <div className="section-inner grid-2col" style={{ direction:even?'rtl':'ltr' }}>
              <div className="reveal" style={{ direction:'ltr', minWidth:0 }}>
                <span style={{ display:'inline-block', background:'#1F1710', color:'#F4ECDF', padding:'6px 14px', borderRadius:100, fontSize:'.72rem', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:'1.5rem' }}>
                  Servicio {s.num}
                </span>
                <h2 className="section-title" style={{ marginBottom:'1.5rem' }}>{s.title}</h2>
                <p style={{ fontSize:'1.1rem', color:'var(--muted)', lineHeight:1.55, marginBottom:'2rem' }}>{s.desc}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:'.8rem', margin:'2rem 0' }}>
                  {s.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'#1F1710', color:'#F4ECDF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'.72rem', fontWeight:700 }}>✓</div>
                      <span style={{ fontSize:'1rem', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap' }}>
                  <a href={wa(s.wsp)} target="_blank" rel="noopener noreferrer" className="btn-wsp">💬 Consultar por WhatsApp</a>
                  <Link href="/testimonios" className="btn-outline">Ver testimonios</Link>
                </div>
              </div>
              <div className="reveal svc-img-col" style={{ direction:'ltr', aspectRatio:'5/6', borderRadius:28, overflow:'hidden', background:s.bg, minWidth:0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={s.title} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
              </div>
            </div>
          </section>
        )
      })}

      {/* PROCESS */}
      <section className="dark-section">
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="reveal" style={{ textAlign:'center', maxWidth:700, margin:'0 auto 4rem' }}>
            <div className="eyebrow" style={{ color:'#F5D78E' }}>Cómo trabajamos</div>
            <h2 className="section-title" style={{ color:'#F4ECDF', marginBottom:'1rem' }}>Un proceso <strong>claro y ordenado</strong></h2>
            <p style={{ color:'rgba(244,236,223,.7)', fontSize:'1.1rem' }}>Desde el primer contacto hasta los resultados medibles.</p>
          </div>
          <div className="grid-4col">
            {PROCESS.map((p, i) => (
              <div key={p.num} className="reveal" style={{ background:'rgba(244,236,223,.06)', borderRadius:20, padding:'2rem', transitionDelay:`${i*.1}s` }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:'3rem', fontWeight:400, color:'#F5D78E', lineHeight:1, marginBottom:'1.5rem' }}>{p.num}</div>
                <h4 style={{ fontFamily:"'Fraunces',serif", fontSize:'1.3rem', fontWeight:500, color:'#F4ECDF', marginBottom:'.6rem' }}>{p.title}</h4>
                <p style={{ fontSize:'.9rem', color:'rgba(244,236,223,.7)', lineHeight:1.5 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad" style={{ background:'#F4ECDF' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div className="reveal" style={{ textAlign:'center', marginBottom:'4rem' }}>
            <div className="eyebrow">Preguntas frecuentes</div>
            <h2 className="section-title">Lo que más me <strong>preguntan</strong></h2>
          </div>
          {FAQS.map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
          <div style={{ borderBottom:'1px solid var(--border)' }}/>
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="landing-cta-section">
        <div className="reveal">
          <h2 className="section-title" style={{ maxWidth:860, margin:'0 auto 3rem', fontSize:'clamp(2.8rem,5.5vw,4.5rem)' }}>
            Da el <strong>primer paso</strong>
          </h2>
          <div style={{ display:'flex', gap:'.75rem', justifyContent:'center', flexWrap:'wrap' }}>
            <a href={wa('Hola Francesca, quiero dar el primer paso. ¿Por dónde comenzamos? 🦫')} target="_blank" rel="noopener noreferrer" className="btn-wsp">💬 Escribirme por WhatsApp</a>
            <Link href="/sobre-mi" className="btn-outline">Conoce mi enfoque</Link>
          </div>
        </div>
      </section>

      <Footer />
      <WspBubble msg="Hola Francesca, vi tus servicios y tengo una consulta 🦫" />
    </>
  )
}
