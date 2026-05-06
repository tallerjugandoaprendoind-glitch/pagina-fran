
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, BookOpen, Users, Eye, Pencil, ChevronLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CourseThumb } from '@/components/admin/CourseCoverUpload'
export const dynamic = 'force-dynamic'

export default async function CoursesListPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_url, is_published, created_at, updated_at,
      enrollments(count),
      modules(count)
    `)
    .order('created_at', { ascending: false })

  const list = (courses || []) as any[]

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 600, color: 'var(--a-ink-3)',
              textDecoration: 'none', marginBottom: 8,
            }}
          >
            <ChevronLeft size={12} strokeWidth={2.5} />
            Panel
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--a-ink)', margin: 0 }}>
            Cursos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--a-ink-3)', marginTop: 4, marginBottom: 0 }}>
            {list.length} {list.length === 1 ? 'curso creado' : 'cursos creados'}
          </p>
        </div>
        <Link href="/admin/courses/new" className="btn-primary" style={{ gap: 6, flexShrink: 0 }}>
          <Plus size={14} strokeWidth={2.5} />
          Crear curso
        </Link>
      </div>

      {/* Lista */}
      {list.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '64px 24px', textAlign: 'center',
          background: '#fff', border: '1px solid var(--a-border)', borderRadius: 14,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--a-surface-2)', color: 'var(--a-brand)',
            display: 'grid', placeItems: 'center', marginBottom: 16,
          }}>
            <BookOpen size={22} strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--a-ink)', marginBottom: 8 }}>
            Aún no tienes cursos
          </h2>
          <p style={{ fontSize: 13, color: 'var(--a-ink-3)', maxWidth: 320, margin: '0 0 20px' }}>
            Crea tu primer curso y empieza a agregar módulos, lecciones y evaluaciones.
          </p>
          <Link href="/admin/courses/new" className="btn-primary" style={{ gap: 6 }}>
            <Plus size={14} strokeWidth={2.5} />
            Crear primer curso
          </Link>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          border: '1px solid var(--a-border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {list.map((course, idx) => {
            const enrollCount = course.enrollments?.[0]?.count || 0
            const modulesCount = course.modules?.[0]?.count || 0

            return (
              <div
                key={course.id}
                className="courses-list-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: idx < list.length - 1 ? '1px solid var(--a-border)' : 'none',
                }}
              >
                {/* Thumb */}
                <div style={{ flexShrink: 0 }}>
                  <CourseThumb coverUrl={course.cover_url} size={52} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--a-ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {course.title}
                    </span>
                    <span className={`badge ${course.is_published ? 'badge-mocha' : 'badge-neutral'}`}>
                      {course.is_published ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--a-ink-3)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} strokeWidth={2.2} />
                      {enrollCount} {enrollCount === 1 ? 'alumno' : 'alumnos'}
                    </span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{modulesCount} {modulesCount === 1 ? 'módulo' : 'módulos'}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>Actualizado {formatDate(course.updated_at || course.created_at)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Link
                    href={`/learn/${course.id}`}
                    target="_blank"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 11px',
                      background: 'var(--a-surface)', border: '1px solid var(--a-border)',
                      borderRadius: 7, fontSize: 12, fontWeight: 600,
                      color: 'var(--a-ink-2)', textDecoration: 'none',
                      transition: 'border-color .12s, background .12s',
                    }}
                    title="Vista previa"
                  >
                    <Eye size={12} strokeWidth={2.2} />
                    Ver
                  </Link>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 11px',
                      background: 'var(--a-brand)', border: '1px solid var(--a-brand)',
                      borderRadius: 7, fontSize: 12, fontWeight: 700,
                      color: '#fff', textDecoration: 'none',
                      transition: 'opacity .12s',
                    }}
                  >
                    <Pencil size={12} strokeWidth={2.2} />
                    Editar
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
