'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, ChevronDown, Lock, BookOpen, Award, Monitor, MessageCircle, PlayCircle, CheckCircle2, GraduationCap } from 'lucide-react'

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const v = u.searchParams.get('v') || u.pathname.replace('/', '')
      return 'https://www.youtube.com/embed/' + v + '?rel=0'
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '')
      return 'https://player.vimeo.com/video/' + id
    }
    return null
  } catch (e) {
    return null
  }
}

type Lesson = { id: string; title: string; order: number }
type Module = { id: string; title: string; order: number; lessons: Lesson[] }

type Props = {
  title: string
  description: string | null
  coverUrl: string | null
  introTitle: string | null
  introVideoUrl: string | null
  introContent: string | null
  certPreviewUrl: string | null
  modules: Module[]
  waUrl: string
}

export default function CoursePreviewPage(props: Props) {
  const { title, description, coverUrl, introTitle, introVideoUrl, introContent, certPreviewUrl, modules, waUrl } = props
  const [openIds, setOpenIds] = useState<string[]>(modules.map(m => m.id))
  const embedUrl = introVideoUrl ? toEmbedUrl(introVideoUrl) : null
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0)

  function toggleModule(id: string) {
    setOpenIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>

      {/* Topbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid #EBEBEB', padding: '0 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B5E4E', textDecoration: 'none', flexShrink: 0 }}>
            <ChevronLeft size={14} strokeWidth={2.2} />
            Catálogo
          </Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1F1710', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>
            {title}
          </span>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <MessageCircle size={14} />
            Solicitar acceso
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Titulo y descripcion */}
        <div style={{ padding: '36px 0 24px' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1F1710', lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: 15, color: '#4A3E33', lineHeight: 1.7, marginBottom: 16, maxWidth: 680 }}>
              {description}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5F4D36', fontWeight: 600 }}>
              <BookOpen size={14} style={{ color: '#E8959A' }} />
              {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5F4D36', fontWeight: 600 }}>
              <PlayCircle size={14} style={{ color: '#E8959A' }} />
              {totalLessons} lecciones
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5F4D36', fontWeight: 600 }}>
              <Award size={14} style={{ color: '#E8959A' }} />
              Certificado incluido
            </span>
          </div>
        </div>

        {/* VIDEO GRANDE o portada */}
        {embedUrl ? (
          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 28, boxShadow: '0 12px 48px rgba(31,23,16,0.18)', background: '#000' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : coverUrl ? (
          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 28, boxShadow: '0 12px 48px rgba(31,23,16,0.12)' }}>
            <img src={coverUrl} alt={title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
          </div>
        ) : null}

        {/* CTA principal */}
        <div style={{ background: 'linear-gradient(135deg, #FAF7F4 0%, #FDF0F2 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 40, border: '1px solid #EDE8E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' as const }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1F1710', marginBottom: 4 }}>
              ¿Te interesa este curso?
            </div>
            <div style={{ fontSize: 13, color: '#6B5E4E' }}>
              Escríbenos por WhatsApp y te asignamos acceso completo a la brevedad.
            </div>
          </div>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#25D366', color: '#fff', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 18px rgba(37,211,102,0.4)', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
            <MessageCircle size={18} />
            Solicitar acceso por WhatsApp
          </a>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 48 }}>
          {[
            { icon: <Monitor size={18} />, title: 'Modalidad 100% virtual', desc: 'Aprende a tu ritmo, desde cualquier dispositivo.' },
            { icon: <Award size={18} />, title: 'Certificado oficial', desc: 'Certificado capyABA emitido al completar el curso.' },
            { icon: <GraduationCap size={18} />, title: 'Instructor especialista', desc: 'Contenido creado por Francesca Ramírez Bontá.' },
          ].map((f, i) => (
            <div key={i} style={{ border: '1px solid #EBEBEB', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FDF0F2', display: 'grid', placeItems: 'center', color: '#E8959A' }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1F1710', marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: '#6B5E4E', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Que aprenderas */}
        {(introTitle || introContent) && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F1710', marginBottom: 12, letterSpacing: '-0.02em' }}>
              {introTitle || 'Qué aprenderás'}
            </h2>
            {introContent && (
              <p style={{ fontSize: 14, color: '#4A3E33', lineHeight: 1.8, maxWidth: 720 }}>{introContent}</p>
            )}
          </div>
        )}

        {/* Programa del curso */}
        {modules.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F1710', marginBottom: 4, letterSpacing: '-0.02em' }}>
              Programa del curso
            </h2>
            <p style={{ fontSize: 13, color: '#9E8C7A', marginBottom: 20 }}>
              {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'} · {totalLessons} lecciones
            </p>
            <div style={{ border: '1px solid #EBEBEB', borderRadius: 14, overflow: 'hidden' }}>
              {modules.map((mod, mi) => {
                const isOpen = openIds.includes(mod.id)
                return (
                  <div key={mod.id} style={{ borderBottom: mi < modules.length - 1 ? '1px solid #EBEBEB' : 'none' }}>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: isOpen ? '#FAF7F4' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background .15s' }}
                    >
                      <ChevronDown size={16} style={{ color: '#5F4D36', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#1F1710' }}>
                        Módulo {mi + 1}. {mod.title}
                      </span>
                      <span style={{ fontSize: 12, color: '#9E8C7A', flexShrink: 0 }}>
                        {mod.lessons.length} {mod.lessons.length === 1 ? 'lección' : 'lecciones'}
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '8px 20px 14px 52px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {mod.lessons.map((lesson, li) => (
                          <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: li < mod.lessons.length - 1 ? '1px solid #F5F2EE' : 'none' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F0EDE8', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                              <Lock size={10} style={{ color: '#9E8C7A' }} />
                            </div>
                            <span style={{ fontSize: 13, color: '#4A3E33' }}>
                              {mi + 1}.{li + 1} {lesson.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Seccion certificado */}
        <div style={{ background: '#FAF7F4', borderRadius: 20, padding: '40px', border: '1px solid #EDE8E1', marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F1710', marginBottom: 24, letterSpacing: '-0.02em' }}>
            Obtén un certificado de estudios
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: certPreviewUrl ? '1fr 340px' : '1fr', gap: 40, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { title: 'Emitido por capyABA', desc: 'Respaldado por Francesca Ramírez Bontá · IBA / IBT.' },
                { title: 'Nota aprobatoria requerida', desc: 'Aprueba el curso con la calificación mínima para obtener tu certificado.' },
                { title: 'Código de verificación único', desc: 'Cada certificado incluye un código para verificar su autenticidad.' },
                { title: 'Descargable en PDF', desc: 'Descarga tu certificado en alta calidad y compártelo donde quieras.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <CheckCircle2 size={16} style={{ color: '#E8959A', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1F1710' }}>{item.title}: </span>
                    <span style={{ fontSize: 14, color: '#6B5E4E' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            {certPreviewUrl && (
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(31,23,16,0.15)' }}>
                <img src={certPreviewUrl} alt="Modelo de certificado" style={{ width: '100%', display: 'block' }} />
              </div>
            )}
          </div>
        </div>

        {/* Banner final */}
        <div style={{ background: '#2C1F14', borderRadius: 20, padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            ¿Listo para empezar?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
            Escríbenos y te damos acceso completo al curso.
          </p>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 20px rgba(37,211,102,0.4)' }}>
            <MessageCircle size={18} />
            Solicitar acceso por WhatsApp
          </a>
        </div>

      </div>
    </div>
  )
}
