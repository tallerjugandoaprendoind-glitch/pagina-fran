
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, FileText, ClipboardList, Users, Eye, ChevronRight,
  GraduationCap, ChevronLeft,
} from 'lucide-react'
import CourseEditor from './CourseEditor'
import { formatDate } from '@/lib/utils'
import CertificateSettings from '@/components/admin/CertificateSettings'
import AdminForumsTab from '@/components/admin/AdminForumsTab'
import AdminCommentsTab from '@/components/admin/AdminCommentsTab'
export const dynamic = 'force-dynamic'

type Tab = 'overview' | 'content' | 'students' | 'settings' | 'forums' | 'comments'

const VALID_TABS: Tab[] = ['overview', 'content', 'students', 'settings', 'forums', 'comments']

export default async function EditCoursePage({
  params, searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const supabase = await createClient()

  // Intentar con las columnas nuevas; si fallan (migración pendiente) retroceder sin ellas
  let courseResult = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_url, passing_score, is_published, created_at, updated_at,
      intro_title, intro_video_url, intro_content, cert_preview_url,
      certificate_template, certificate_hours, certificate_ceus,
      certificate_modality, certificate_area, certificate_event_date,
      modules ( id, title, description, "order",
        lessons ( id, title, video_url, content, "order", duration_minutes )
      )
    `)
    .eq('id', params.id)
    .single()

  if (courseResult.error) {
    // Fallback sin columnas de intro (migración aún no ejecutada)
    courseResult = await supabase
      .from('courses')
      .select(`
        id, title, description, cover_url, passing_score, is_published, created_at, updated_at,
        certificate_template, certificate_hours, certificate_ceus,
        certificate_modality, certificate_area, certificate_event_date,
        modules ( id, title, description, "order",
          lessons ( id, title, video_url, content, "order", duration_minutes )
        )
      `)
      .eq('id', params.id)
      .single()
  }

  const course = courseResult.data
  if (!course) notFound()

  const [
    { data: quizzes },
    { data: assignments },
    { count: enrollmentCount },
    { data: enrollments },
    { data: resources },
    { data: forums },
  ] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, title, description, type, passing_score, module_id, course_id, questions(count)')
      .eq('course_id', params.id),
    supabase
      .from('assignments')
      .select('id, title, instructions, fields, created_at, module_id, course_id')
      .eq('course_id', params.id),
    supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', params.id),
    supabase
      .from('enrollments')
      .select('id, status, final_score, started_at, completed_at, profiles:student_id(id, full_name, email)')
      .eq('course_id', params.id)
      .order('started_at', { ascending: false }),
    supabase
      .from('course_resources')
      .select('id, title, description, resource_type, file_url, file_name, file_size, external_url, order, module_id, course_id')
      .eq('course_id', params.id),
    supabase
      .from('course_forums')
      .select('id, title, description, module_id, course_id')
      .eq('course_id', params.id),
  ])

  const sortedModules = (course.modules as any[])
    .sort((a, b) => a.order - b.order)
    .map((m: any) => ({ ...m, lessons: m.lessons.sort((a: any, b: any) => a.order - b.order) }))

  // Lista plana de lecciones con info de módulo (para la pestaña Comentarios)
  const allLessonsFlat: { id: string; title: string; order: number; module_title: string; module_order: number }[] = []
  for (const mod of sortedModules) {
    for (const lesson of mod.lessons) {
      allLessonsFlat.push({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        module_title: mod.title || 'Módulo',
        module_order: mod.order,
      })
    }
  }

  // Agrupar quizzes y assignments por módulo
  const quizzesByModule: Record<string, any[]> = {}
  const assignmentsByModule: Record<string, any[]> = {}
  const courseLevelQuizzes: any[] = []
  const courseLevelAssignments: any[] = []

  for (const q of (quizzes || []) as any[]) {
    const item = {
      id: q.id,
      title: q.title,
      type: q.type,
      passing_score: q.passing_score,
      questions_count: q.questions?.[0]?.count || 0,
    }
    if (q.module_id) {
      if (!quizzesByModule[q.module_id]) quizzesByModule[q.module_id] = []
      quizzesByModule[q.module_id].push(item)
    } else {
      courseLevelQuizzes.push(item)
    }
  }

  for (const a of (assignments || []) as any[]) {
    const item = {
      id: a.id,
      title: a.title,
      fields_count: (a.fields as any[])?.length || 0,
    }
    if (a.module_id) {
      if (!assignmentsByModule[a.module_id]) assignmentsByModule[a.module_id] = []
      assignmentsByModule[a.module_id].push(item)
    } else {
      courseLevelAssignments.push(item)
    }
  }
  // Agrupar resources y forums por módulo
  const resourcesByModule: Record<string, any[]> = {}
  const forumsByModule: Record<string, any[]> = {}
  const courseLevelResources: any[] = []
  const courseLevelForums: any[] = []
  const allForumsFlat: any[] = []

  for (const r of (resources || []) as any[]) {
    const item = {
      id: r.id, title: r.title, description: r.description,
      resource_type: r.resource_type, file_url: r.file_url,
      file_name: r.file_name, file_size: r.file_size,
      external_url: r.external_url, order: r.order,
    }
    if (r.module_id) {
      if (!resourcesByModule[r.module_id]) resourcesByModule[r.module_id] = []
      resourcesByModule[r.module_id].push(item)
    } else {
      courseLevelResources.push(item)
    }
  }

  for (const f of (forums || []) as any[]) {
    const moduleTitleForForum = f.module_id
      ? sortedModules.find((m: any) => m.id === f.module_id)?.title || 'Módulo'
      : null
    const item = { id: f.id, title: f.title, description: f.description, module_id: f.module_id, module_title: moduleTitleForForum }
    if (f.module_id) {
      if (!forumsByModule[f.module_id]) forumsByModule[f.module_id] = []
      forumsByModule[f.module_id].push({ id: f.id, title: f.title, description: f.description })
    } else {
      courseLevelForums.push({ id: f.id, title: f.title, description: f.description })
    }
    allForumsFlat.push(item)
  }

  const rawTab = searchParams.tab as Tab | undefined
  const activeTab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'content'

  const totalLessons = sortedModules.reduce((s: number, m: any) => s + m.lessons.length, 0)
  const totalQuizzes = (quizzes || []).length
  const totalAssignments = (assignments || []).length

  return (
    <div>
      {/* Header del curso */}
      <div style={{ padding: '20px 32px 0', background: 'var(--a-bg)' }}>
        <Link href="/admin" className="admin-breadcrumb" style={{
          textDecoration: 'none', display: 'inline-flex', marginBottom: 8,
        }}>
          <ChevronLeft size={12} strokeWidth={2.2} />
          <span style={{ color: 'var(--a-ink-3)' }}>Cursos</span>
          <span className="sep">/</span>
          <span className="current">{course.title}</span>
        </Link>

        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, marginBottom: 18, flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {course.cover_url ? (
              <img
                src={course.cover_url}
                alt={course.title}
                style={{
                  width: 80, height: 54,
                  borderRadius: 8, objectFit: 'cover',
                  flexShrink: 0, marginTop: 2,
                  border: '1px solid var(--a-border)',
                }}
              />
            ) : null}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 22, fontWeight: 800,
                  letterSpacing: '-0.025em', color: 'var(--a-ink)',
                  margin: 0,
                }}>
                  {course.title}
                </h1>
                <span className={`badge ${course.is_published ? 'badge-mocha' : 'badge-neutral'}`}>
                  {course.is_published ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--a-ink-3)' }}>
                {enrollmentCount || 0} {enrollmentCount === 1 ? 'alumno' : 'alumnos'}
                {' · '}
                {sortedModules.length} {sortedModules.length === 1 ? 'módulo' : 'módulos'}
                {' · '}
                Actualizado {formatDate(course.updated_at || course.created_at)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href={`/learn/${course.id}`}
              className="btn-secondary"
              target="_blank"
            >
              <Eye size={14} strokeWidth={2.2} />
              Vista previa
            </Link>
          </div>
        </div>

        {/* Tabs simplificadas */}
        <div className="editor-tabs">
          <TabLink href={`/admin/courses/${course.id}?tab=overview`} active={activeTab === 'overview'}>
            Resumen
          </TabLink>
          <TabLink href={`/admin/courses/${course.id}`} active={activeTab === 'content'}>
            Contenido <span className="count">{totalLessons + totalQuizzes + totalAssignments}</span>
          </TabLink>
          <TabLink href={`/admin/courses/${course.id}?tab=students`} active={activeTab === 'students'}>
            Alumnos <span className="count">{enrollmentCount || 0}</span>
          </TabLink>
          <TabLink href={`/admin/courses/${course.id}?tab=forums`} active={activeTab === 'forums'}>
            Foros <span className="count">{allForumsFlat.length}</span>
          </TabLink>
          <TabLink href={`/admin/courses/${course.id}?tab=comments`} active={activeTab === 'comments'}>
            Comentarios <span className="count">{totalLessons}</span>
          </TabLink>
          <TabLink href={`/admin/courses/${course.id}?tab=settings`} active={activeTab === 'settings'}>
            Configuración
          </TabLink>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

        {activeTab === 'overview' && (
          <OverviewTab
            courseId={course.id}
            modulesCount={sortedModules.length}
            lessonsCount={totalLessons}
            quizzesCount={totalQuizzes}
            assignmentsCount={totalAssignments}
            enrollmentCount={enrollmentCount || 0}
            completedCount={(enrollments || []).filter((e: any) => e.status === 'completed').length}
            description={course.description || ''}
          />
        )}

        {activeTab === 'content' && (
          <CourseEditor course={{
            id: course.id,
            title: course.title,
            description: course.description || '',
            cover_url: course.cover_url || null,
            passing_score: course.passing_score,
            is_published: course.is_published,
            modules: sortedModules,
            quizzesByModule,
            assignmentsByModule,
            courseLevelQuizzes,
            courseLevelAssignments,
            resourcesByModule,
            forumsByModule,
            courseLevelResources,
            courseLevelForums,
          }} />
        )}

        {activeTab === 'students' && (
          <StudentsTab courseId={course.id} enrollments={enrollments || []} passingScore={course.passing_score} />
        )}

        {activeTab === 'forums' && (
          <AdminForumsTab courseId={course.id} forums={allForumsFlat} />
        )}

        {activeTab === 'comments' && (
          <AdminCommentsTab lessons={allLessonsFlat} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab course={course} />
        )}
      </div>
    </div>
  )
}

/* ─────────────────── Componentes de cada tab ─────────────────── */

function TabLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`editor-tab ${active ? 'active' : ''}`}>
      {children}
    </Link>
  )
}

function OverviewTab({
  courseId, modulesCount, lessonsCount, quizzesCount, assignmentsCount,
  enrollmentCount, completedCount, description,
}: any) {
  const completionRate = enrollmentCount > 0 ? Math.round((completedCount / enrollmentCount) * 100) : 0

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
      }} className="overview-kpis">
        <MetricCard label="Módulos" value={modulesCount} />
        <MetricCard label="Lecciones" value={lessonsCount} />
        <MetricCard label="Evaluaciones" value={quizzesCount} />
        <MetricCard label="Asignaciones" value={assignmentsCount} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 18,
      }} className="overview-grid">
        <div className="card" style={{ padding: 20 }}>
          <h2 className="section-heading" style={{ marginBottom: 12 }}>Acciones rápidas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <QuickAction
              href={`/admin/courses/${courseId}`}
              icon={<Plus size={14} strokeWidth={2.2} />}
              label="Editar contenido"
              desc="Módulos, lecciones, evaluaciones y asignaciones"
            />
            <QuickAction
              href={`/admin/courses/${courseId}?tab=students`}
              icon={<Users size={14} strokeWidth={2.2} />}
              label="Ver progreso de alumnos"
              desc={`${enrollmentCount} inscritos`}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h2 className="section-heading" style={{ marginBottom: 14 }}>Progreso general</h2>
          <div style={{
            fontSize: 36, fontWeight: 800, letterSpacing: '-0.035em',
            color: 'var(--a-ink)', lineHeight: 1, marginBottom: 6,
          }}>
            {completionRate}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--a-ink-3)', marginBottom: 14 }}>
            {completedCount} de {enrollmentCount} alumnos completaron el curso
          </div>
          <div style={{
            height: 8, background: 'var(--a-surface-2)', borderRadius: 100, overflow: 'hidden',
          }}>
            <div style={{
              width: `${completionRate}%`,
              height: '100%',
              background: 'var(--a-brand)',
              transition: 'width .3s',
            }} />
          </div>

          {description && (
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--a-border)',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color: 'var(--a-ink-3)', textTransform: 'uppercase', marginBottom: 6,
              }}>
                Descripción
              </div>
              <p style={{ fontSize: 13, color: 'var(--a-ink-2)', lineHeight: 1.5 }}>
                {description}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .overview-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .overview-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: 14, background: 'var(--a-surface)',
      border: '1px solid var(--a-border)', borderRadius: 10,
    }}>
      <div className="kpi-label">{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em',
        color: 'var(--a-ink)', marginTop: 8, lineHeight: 1,
      }}>{value}</div>
    </div>
  )
}

function QuickAction({ href, icon, label, desc }: any) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        textDecoration: 'none',
        transition: 'background .1s',
      }}
      className="qa-item"
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: 'var(--a-surface-2)', color: 'var(--a-brand)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>{desc}</div>
      </div>
      <ChevronRight size={14} strokeWidth={2} color="var(--a-ink-3)" />
      <style>{`
        .qa-item:hover { background: var(--a-surface); }
      `}</style>
    </Link>
  )
}

function StudentsTab({ courseId, enrollments, passingScore }: { courseId: string; enrollments: any[]; passingScore: number }) {
  if (enrollments.length === 0) {
    return (
      <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--a-surface-2)', color: 'var(--a-brand)',
          margin: '0 auto 12px', display: 'grid', placeItems: 'center',
        }}>
          <Users size={20} strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--a-ink)', marginBottom: 4 }}>
          Ningún alumno inscrito aún
        </h3>
        <p style={{ fontSize: 12, color: 'var(--a-ink-2)', maxWidth: 340, margin: '0 auto 14px' }}>
          Ve a <Link href="/admin/students" style={{ color: 'var(--a-brand)', fontWeight: 600 }}>Alumnos</Link> y asigna este curso.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
      }}>
        <h2 className="section-heading">
          Progreso de alumnos ({enrollments.length})
        </h2>
      </div>

      <div className="card">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) 110px 110px 140px',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--a-surface)',
          borderBottom: '1px solid var(--a-border)',
          fontSize: 10, fontWeight: 700,
          color: 'var(--a-ink-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }} className="st-header">
          <div>Alumno</div>
          <div style={{ textAlign: 'center' }}>Estado</div>
          <div style={{ textAlign: 'center' }}>Nota</div>
          <div>Inicio</div>
        </div>

        {enrollments.map((e: any) => (
          <div
            key={e.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) 110px 110px 140px',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid var(--a-border)',
              alignItems: 'center',
            }}
            className="st-row"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--a-side-bg)',
                color: 'var(--cream)',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700,
                flexShrink: 0,
              }}>
                {(e.profiles?.full_name || e.profiles?.email || 'A')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--a-ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {e.profiles?.full_name || 'Sin nombre'}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--a-ink-3)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {e.profiles?.email}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className={`badge ${
                e.status === 'completed' ? 'badge-mocha' :
                e.status === 'failed' ? 'badge-warning' : 'badge-neutral'
              }`}>
                {e.status === 'completed' ? 'Completado' :
                 e.status === 'failed' ? 'No aprobado' : 'En curso'}
              </span>
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>
              {e.final_score != null ? `${e.final_score}%` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>
              {formatDate(e.started_at)}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .st-header { display: none !important; }
          .st-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function SettingsTab({ course }: { course: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 24 }}>
        <h2 className="section-heading" style={{ marginBottom: 4 }}>
          Configuración del curso
        </h2>
        <p style={{ fontSize: 12, color: 'var(--a-ink-3)', marginBottom: 20 }}>
          Metadatos, nota mínima y estado de publicación. Edita título y descripción en la pestaña Contenido.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18,
          padding: 18, background: 'var(--a-surface)', borderRadius: 10,
        }} className="st-settings-grid">
          <div>
            <div className="kpi-label">Nota mínima</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {course.passing_score}%
            </div>
          </div>
          <div>
            <div className="kpi-label">Estado</div>
            <div style={{ marginTop: 4 }}>
              <span className={`badge ${course.is_published ? 'badge-mocha' : 'badge-neutral'}`}>
                {course.is_published ? 'Publicado' : 'Borrador'}
              </span>
            </div>
          </div>
          <div>
            <div className="kpi-label">Creado</div>
            <div style={{ fontSize: 13, marginTop: 4, color: 'var(--a-ink)' }}>
              {formatDate(course.created_at)}
            </div>
          </div>
          <div>
            <div className="kpi-label">Actualizado</div>
            <div style={{ fontSize: 13, marginTop: 4, color: 'var(--a-ink)' }}>
              {formatDate(course.updated_at || course.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Configuración del certificado */}
      <CertificateSettings
        courseId={course.id}
        initial={{
          certificate_template: course.certificate_template || 'ceu',
          certificate_hours: course.certificate_hours,
          certificate_ceus: course.certificate_ceus,
          certificate_modality: course.certificate_modality || 'online',
          certificate_area: course.certificate_area || 'topicos_aba',
          certificate_event_date: course.certificate_event_date,
        }}
      />

      <style>{`
        @media (max-width: 600px) {
          .st-settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
