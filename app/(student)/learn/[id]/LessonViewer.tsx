'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { triggerCompletionCheck } from '@/lib/certificates/trigger-completion'
import {
  PlayCircle, FileText, ClipboardList, MessageCircle, FileArchive,
  CheckCircle2, Circle, ChevronDown, ChevronRight, Award,
  SkipForward, ChevronLeft, Save, BookOpen, ListChecks, StickyNote,
  Clock,
} from 'lucide-react'
import QuizInline from './QuizInline'
import AssignmentInline from './AssignmentInline'
import ResourceViewer from './ResourceViewer'
import ForumViewer from './ForumViewer'
import LessonComments from './LessonComments'

/* ─────────── TIPOS ─────────── */

type Lesson = {
  id: string
  title: string
  video_url: string | null
  content: string | null
  order: number
  duration_minutes: number | null
}
type Module = {
  id: string
  title: string
  description: string | null
  order: number
  lessons: Lesson[]
}
type Quiz = {
  id: string
  title: string
  type: string
  passing_score: number
  module_id: string | null
  description: string | null
}
type Assignment = {
  id: string
  title: string
  instructions: string | null
  module_id: string | null
  fields: any[]
}
type Resource = {
  id: string
  title: string
  description: string
  resource_type: 'file' | 'link'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  external_url: string | null
  module_id: string | null
  order: number
}
type Forum = {
  id: string
  title: string
  description: string
  module_id: string | null
}

type Props = {
  courseId: string
  enrollmentId: string
  previewMode?: boolean
  modules: Module[]
  progress: { lesson_id: string; watch_percentage: number; completed_at: string | null }[]
  passingScore: number
  quizzesByModule: Record<string, Quiz[]>
  assignmentsByModule: Record<string, Assignment[]>
  resourcesByModule: Record<string, Resource[]>
  forumsByModule: Record<string, Forum[]>
  courseLevelQuizzes: Quiz[]
  courseLevelAssignments: Assignment[]
  courseLevelResources: Resource[]
  courseLevelForums: Forum[]
  attemptsByQuizId: Record<string, any>
  submissionsByAssignmentId: Record<string, any>
  forumsWithUserPost: string[]
  initialItemKey?: string
}

type ItemType = 'lesson' | 'quiz' | 'assignment' | 'resource' | 'forum'
type Item = {
  key: string
  type: ItemType
  id: string
  title: string
  moduleId: string | null
  done?: boolean
  meta?: string
  data: any
  numbering?: string  // ej. "1.1", "1.2"
}

type Tab = 'content' | 'activities' | 'notes'


/* ═════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═════════════════════════════════════════════════════ */

export default function LessonViewer(props: Props) {
  const {
    courseId, enrollmentId, previewMode, modules, progress, passingScore,
    quizzesByModule, assignmentsByModule, resourcesByModule, forumsByModule,
    courseLevelQuizzes, courseLevelAssignments, courseLevelResources, courseLevelForums,
    attemptsByQuizId, submissionsByAssignmentId, forumsWithUserPost,
    initialItemKey,
  } = props

  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // Estado: tab activa, módulos abiertos, progreso, intentos
  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(modules.map(m => m.id))
  )
  const [progressMap, setProgressMap] = useState(
    new Map(progress.map(p => [p.lesson_id, p]))
  )
  const [attemptsState, setAttemptsState] = useState<Record<string, any>>(attemptsByQuizId)
  const [submissionsState, setSubmissionsState] = useState<Record<string, any>>(submissionsByAssignmentId)
  const [forumsCompletedState, setForumsCompletedState] = useState<Record<string, boolean>>(
    Object.fromEntries((forumsWithUserPost || []).map(id => [id, true]))
  )
  const [marking, setMarking] = useState(false)

  // Construir lista plana de items intercalados por módulo
  // ORDENADOS por el campo "order" unificado — incluye lecciones, quizzes,
  // asignaciones, recursos y foros en el mismo flujo numerado (M.N).
  const { allItems, byModule } = useMemo(() => {
    const out: Item[] = []
    const grouped: { module: Module | null; items: Item[] }[] = []

    for (const mod of modules) {
      // 1. Reunir todos los tipos con su order
      type RawItem = { order: number; item: Omit<Item, 'numbering'> }
      const raw: RawItem[] = []

      for (const lesson of (mod.lessons || [])) {
        const prog = progressMap.get(lesson.id)
        raw.push({
          order: lesson.order ?? 0,
          item: {
            key: `lesson:${lesson.id}`,
            type: 'lesson',
            id: lesson.id,
            title: lesson.title,
            moduleId: mod.id,
            done: !!prog?.completed_at,
            meta: lesson.duration_minutes ? `${lesson.duration_minutes} min` : '',
            data: lesson,
          },
        })
      }

      for (const q of (quizzesByModule[mod.id] || [])) {
        const attempt = attemptsState[q.id]
        raw.push({
          order: (q as any).order ?? 999,
          item: {
            key: `quiz:${q.id}`,
            type: 'quiz',
            id: q.id,
            title: q.title,
            moduleId: mod.id,
            done: !!attempt?.passed,
            meta: q.type === 'exam' ? 'Examen' : 'Cuestionario',
            data: q,
          },
        })
      }

      for (const a of (assignmentsByModule[mod.id] || [])) {
        const sub = submissionsState[a.id]
        raw.push({
          order: (a as any).order ?? 999,
          item: {
            key: `assignment:${a.id}`,
            type: 'assignment',
            id: a.id,
            title: a.title,
            moduleId: mod.id,
            done: !!sub?.submitted_at,
            meta: `${(a.fields || []).length} ${(a.fields || []).length === 1 ? 'campo' : 'campos'}`,
            data: a,
          },
        })
      }

      for (const r of (resourcesByModule[mod.id] || [])) {
        raw.push({
          order: r.order ?? 999,
          item: {
            key: `resource:${r.id}`,
            type: 'resource',
            id: r.id,
            title: r.title,
            moduleId: mod.id,
            done: false,
            meta: r.resource_type === 'file' ? 'Archivo' : 'Enlace',
            data: r,
          },
        })
      }

      for (const f of (forumsByModule[mod.id] || [])) {
        raw.push({
          order: (f as any).order ?? 999,
          item: {
            key: `forum:${f.id}`,
            type: 'forum',
            id: f.id,
            title: f.title,
            moduleId: mod.id,
            done: !!forumsCompletedState[f.id],
            meta: 'Foro',
            data: f,
          },
        })
      }

      // 2. Ordenar por order unificado y asignar numeración M.N
      raw.sort((a, b) => a.order - b.order)
      const items: Item[] = raw.map((r, idx) => ({
        ...r.item,
        numbering: `${mod.order + 1}.${idx + 1}`,
      }))

      out.push(...items)
      grouped.push({ module: mod, items })
    }

    // Items a nivel de curso (sin módulo) — sin numeración
    const courseItems: Item[] = []
    for (const q of courseLevelQuizzes) {
      const attempt = attemptsState[q.id]
      courseItems.push({
        key: `quiz:${q.id}`,
        type: 'quiz',
        id: q.id,
        title: q.title,
        moduleId: null,
        done: !!attempt?.passed,
        meta: q.type === 'exam' ? 'Examen final' : 'Cuestionario',
        data: q,
      })
    }
    for (const a of courseLevelAssignments) {
      const sub = submissionsState[a.id]
      courseItems.push({
        key: `assignment:${a.id}`,
        type: 'assignment',
        id: a.id,
        title: a.title,
        moduleId: null,
        done: !!sub?.submitted_at,
        meta: `${(a.fields || []).length} ${(a.fields || []).length === 1 ? 'campo' : 'campos'}`,
        data: a,
      })
    }
    for (const r of courseLevelResources) {
      courseItems.push({
        key: `resource:${r.id}`,
        type: 'resource',
        id: r.id,
        title: r.title,
        moduleId: null,
        done: false,
        meta: r.resource_type === 'file' ? 'Archivo' : 'Enlace',
        data: r,
      })
    }
    for (const f of courseLevelForums) {
      courseItems.push({
        key: `forum:${f.id}`,
        type: 'forum',
        id: f.id,
        title: f.title,
        moduleId: null,
        done: !!forumsCompletedState[f.id],
        meta: 'Foro',
        data: f,
      })
    }
    if (courseItems.length) {
      out.push(...courseItems)
      grouped.push({ module: null, items: courseItems })
    }

    return { allItems: out, byModule: grouped }
  }, [
    modules, quizzesByModule, assignmentsByModule, resourcesByModule, forumsByModule,
    courseLevelQuizzes, courseLevelAssignments, courseLevelResources, courseLevelForums,
    progressMap, attemptsState, submissionsState, forumsCompletedState,
  ])

  // Item actual (de URL ?item= o el primero)
  const itemFromUrl = searchParams.get('item') || initialItemKey
  const currentItem = itemFromUrl
    ? allItems.find(i => i.key === itemFromUrl) || allItems[0]
    : allItems[0]

  const currentIdx = currentItem ? allItems.findIndex(i => i.key === currentItem.key) : -1
  const prevItem = currentIdx > 0 ? allItems[currentIdx - 1] : null
  const nextItem = currentIdx >= 0 && currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null

  // Cuando cambia la URL, abre el módulo del item actual
  useEffect(() => {
    if (currentItem?.moduleId) {
      setOpenModules(prev => new Set(prev).add(currentItem.moduleId!))
    }
  }, [currentItem?.moduleId])

  function goToItem(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('item', key)
    router.push(`/learn/${courseId}?${params.toString()}`, { scroll: false })
  }

  function toggleModule(id: string) {
    const next = new Set(openModules)
    next.has(id) ? next.delete(id) : next.add(id)
    setOpenModules(next)
  }

  // Marcar lección como completada
  async function markLessonComplete() {
    if (!currentItem || currentItem.type !== 'lesson') return
    if (previewMode) {
      showToast('Vista previa: el progreso no se guarda', 'info')
      if (nextItem) setTimeout(() => goToItem(nextItem.key), 400)
      return
    }
    setMarking(true)
    const supabase = createClient()

    const { data } = await supabase.from('lesson_progress').upsert({
      enrollment_id: enrollmentId,
      lesson_id: currentItem.id,
      watch_percentage: 100,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'enrollment_id,lesson_id' }).select().single()

    if (data) {
      setProgressMap(new Map(progressMap).set(currentItem.id, data as any))
      showToast('Lección completada', 'success')
      const result = await triggerCompletionCheck(enrollmentId)
      if (result.completed && result.certificateUrl) {
        showToast('¡Felicidades! Tu certificado está listo 🎉', 'success')
      }
    }
    setMarking(false)

    if (nextItem) {
      setTimeout(() => goToItem(nextItem.key), 400)
    }
  }

  function onQuizSubmitted(quizId: string, attempt: any) {
    setAttemptsState({ ...attemptsState, [quizId]: attempt })
    triggerCompletionCheck(enrollmentId).then(result => {
      if (result.completed && result.certificateUrl) {
        showToast('¡Felicidades! Tu certificado está listo 🎉', 'success')
      }
    })
  }

  function onAssignmentSubmitted(assignmentId: string, submission: any) {
    setSubmissionsState({ ...submissionsState, [assignmentId]: submission })
    triggerCompletionCheck(enrollmentId).then(result => {
      if (result.completed && result.certificateUrl) {
        showToast('¡Felicidades! Tu certificado está listo 🎉', 'success')
      }
    })
  }

  function onForumCompleted(forumId: string) {
    setForumsCompletedState(prev => ({ ...prev, [forumId]: true }))
  }

  // Progreso global — los recursos no cuentan (no tienen estado completable)
  const progressibleItems = allItems.filter(i => i.type !== 'resource')
  const completedCount = progressibleItems.filter(i => i.done).length
  const totalCount = progressibleItems.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="learn-grid" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 440px',
      gap: 0,
      minHeight: 'calc(100vh - 52px)',
      background: '#F5F2EB',
    }}>
      {/* MAIN — player + contenido */}
      <div style={{ padding: '24px 32px 80px', minWidth: 0 }}>
        <MainPlayer
          item={currentItem}
          enrollmentId={enrollmentId}
          previewMode={!!previewMode}
          passingScore={passingScore}
          currentIdx={currentIdx}
          totalItems={allItems.length}
          isCompleted={!!currentItem?.done}
          marking={marking}
          onMarkComplete={markLessonComplete}
          onQuizSubmitted={onQuizSubmitted}
          onAssignmentSubmitted={onAssignmentSubmitted}
          onForumCompleted={onForumCompleted}
          prevItem={prevItem}
          nextItem={nextItem}
          onGoToItem={goToItem}
          attemptForCurrentQuiz={currentItem?.type === 'quiz' ? attemptsState[currentItem.id] : undefined}
          submissionForCurrentAssignment={currentItem?.type === 'assignment' ? submissionsState[currentItem.id] : undefined}
        />
      </div>

      {/* SIDEBAR */}
      <aside style={{
        background: '#fff',
        borderLeft: '1px solid rgba(31,23,16,0.08)',
        position: 'sticky', top: 0,
        alignSelf: 'flex-start',
        height: 'calc(100vh - 52px)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Tabs arriba */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(31,23,16,0.08)',
          padding: '12px 16px 0',
          gap: 4,
          background: '#fff',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <SidebarTab active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<BookOpen size={14} strokeWidth={2.2} />} label="Contenido" />
          <SidebarTab active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={<ListChecks size={14} strokeWidth={2.2} />} label="Actividades" />
          <SidebarTab active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<StickyNote size={14} strokeWidth={2.2} />} label="Apuntes" />
        </div>

        {/* Contenido de la tab */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'content' && (
            <ContentTab
              byModule={byModule}
              currentItemKey={currentItem?.key}
              openModules={openModules}
              onToggleModule={toggleModule}
              onGoToItem={goToItem}
              progressPct={progressPct}
              completedCount={completedCount}
              totalCount={totalCount}
              passingScore={passingScore}
            />
          )}
          {activeTab === 'activities' && (
            <ActivitiesTab
              allItems={allItems}
              currentItemKey={currentItem?.key}
              onGoToItem={goToItem}
              attemptsState={attemptsState}
              submissionsState={submissionsState}
              passingScore={passingScore}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              currentItem={currentItem}
              enrollmentId={enrollmentId}
              previewMode={!!previewMode}
            />
          )}
        </div>
      </aside>

      <style>{`
        @media (max-width: 1100px) {
          .learn-grid {
            grid-template-columns: 1fr !important;
          }
          .learn-grid aside {
            position: static !important;
            height: auto !important;
            border-left: none !important;
            border-top: 1px solid rgba(31,23,16,0.08);
          }
        }
      `}</style>
    </div>
  )
}


/* ═════════════════════════════════════════════════════
   TAB BUTTON
   ═════════════════════════════════════════════════════ */

function SidebarTab({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? '#1F1710' : 'transparent'}`,
        color: active ? '#1F1710' : '#8A7860',
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: -1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}


/* ═════════════════════════════════════════════════════
   TAB CONTENIDO — lista de módulos con items
   ═════════════════════════════════════════════════════ */

function ContentTab({
  byModule, currentItemKey, openModules, onToggleModule, onGoToItem,
  progressPct, completedCount, totalCount, passingScore,
}: {
  byModule: { module: Module | null; items: Item[] }[]
  currentItemKey?: string
  openModules: Set<string>
  onToggleModule: (id: string) => void
  onGoToItem: (key: string) => void
  progressPct: number
  completedCount: number
  totalCount: number
  passingScore: number
}) {
  return (
    <div>
      {/* Bloque de progreso arriba */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(31,23,16,0.06)' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1F1710' }}>
            Contenido del curso
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#185FA5' }}>
            {progressPct}%
          </span>
        </div>
        <div style={{
          height: 6,
          background: '#E6F1FB',
          borderRadius: 100,
          overflow: 'hidden',
          marginBottom: 6,
        }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            background: '#185FA5',
            transition: 'width .25s ease',
            borderRadius: 100,
          }} />
        </div>
        <div style={{ fontSize: 11, color: '#8A7860' }}>
          {completedCount} de {totalCount} completados · Aprobación: {passingScore}%
        </div>
      </div>

      {/* Listado de módulos */}
      <div style={{ paddingBottom: 24 }}>
        {byModule.map((group, gi) => {
          const moduleId = group.module?.id || `course-level-${gi}`
          const isOpen = group.module ? openModules.has(group.module.id) : true
          const moduleTitle = group.module
            ? `Módulo ${group.module.order + 1}`
            : 'Evaluación final'
          const moduleSubtitle = group.module?.title || ''
          const completedInGroup = group.items.filter(i => i.done).length
          const totalInGroup = group.items.length

          return (
            <div key={moduleId}>
              {/* Header del módulo (clickable) */}
              <button
                onClick={() => group.module && onToggleModule(group.module.id)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(31,23,16,0.06)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: group.module ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#8A7860',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    marginBottom: 2,
                  }}>
                    {moduleTitle}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: '#1F1710',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {moduleSubtitle || 'Sección sin nombre'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8A7860', marginTop: 2 }}>
                    {completedInGroup}/{totalInGroup} completados
                  </div>
                </div>
                {group.module && (
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    style={{
                      color: '#8A7860',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform .15s ease',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>

              {/* Items del módulo */}
              {isOpen && (
                <div>
                  {group.items.map(item => (
                    <ItemRow
                      key={item.key}
                      item={item}
                      isActive={item.key === currentItemKey}
                      onClick={() => onGoToItem(item.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


/* ═════════════════════════════════════════════════════
   ITEM ROW — una entrada del sidebar (item de cualquier tipo)
   ═════════════════════════════════════════════════════ */

function ItemRow({ item, isActive, onClick }: {
  item: Item
  isActive: boolean
  onClick: () => void
}) {
  const visual = getItemVisual(item)

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: isActive ? '#FAF5EB' : 'transparent',
        border: 'none',
        borderLeft: isActive ? '3px solid #1F1710' : '3px solid transparent',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'background .1s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = '#FAF7F2'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Visual: thumbnail del video o ícono colorido por tipo */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        {visual.thumbnail ? (
          <div style={{
            width: 70, height: 42,
            borderRadius: 6,
            overflow: 'hidden',
            background: '#1a1a1a',
            position: 'relative',
          }}>
            <img
              src={visual.thumbnail}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.2)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PlayCircle size={16} strokeWidth={0} fill="#1F1710" />
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            width: 42, height: 42,
            borderRadius: 6,
            background: visual.bg,
            color: visual.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {visual.icon}
          </div>
        )}
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: isActive ? 700 : 500, color: '#1F1710',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.numbering && <span style={{ color: '#8A7860', fontWeight: 600 }}>{item.numbering} </span>}
          {item.title}
        </div>
        {item.meta && (
          <div style={{
            fontSize: 11, color: '#8A7860',
            marginTop: 3, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {item.type === 'lesson' && <Clock size={10} strokeWidth={2.2} />}
            {item.meta}
          </div>
        )}
      </div>

      {/* Estado: completado o no */}
      <div style={{ flexShrink: 0 }}>
        {item.done ? (
          <CheckCircle2 size={18} strokeWidth={2.2} style={{ color: '#1D9E75' }} />
        ) : (
          <Circle size={18} strokeWidth={2} style={{ color: '#D9CEB8' }} />
        )}
      </div>
    </button>
  )
}

function getItemVisual(item: Item) {
  if (item.type === 'lesson' && item.data?.video_url) {
    const ytId = extractYouTubeId(item.data.video_url)
    if (ytId) {
      return {
        thumbnail: `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`,
        icon: <PlayCircle size={20} strokeWidth={2.2} />,
        bg: '#FAEEDA', fg: '#854F0B',
      }
    }
    const vimeoId = extractVimeoId(item.data.video_url)
    if (vimeoId) {
      return {
        thumbnail: `https://vumbnail.com/${vimeoId}.jpg`,
        icon: <PlayCircle size={20} strokeWidth={2.2} />,
        bg: '#FAEEDA', fg: '#854F0B',
      }
    }
  }
  if (item.type === 'lesson') {
    return { thumbnail: null, icon: <PlayCircle size={20} strokeWidth={2.2} />, bg: '#FAEEDA', fg: '#854F0B' }
  }
  if (item.type === 'quiz') {
    return { thumbnail: null, icon: <ListChecks size={20} strokeWidth={2.2} />, bg: '#E1F5EE', fg: '#0F6E56' }
  }
  if (item.type === 'assignment') {
    return { thumbnail: null, icon: <ClipboardList size={20} strokeWidth={2.2} />, bg: '#FAECE7', fg: '#993C1D' }
  }
  if (item.type === 'forum') {
    return { thumbnail: null, icon: <MessageCircle size={20} strokeWidth={2.2} />, bg: '#E6F1FB', fg: '#185FA5' }
  }
  if (item.type === 'resource') {
    return { thumbnail: null, icon: <FileArchive size={20} strokeWidth={2.2} />, bg: '#EEEDFE', fg: '#534AB7' }
  }
  return { thumbnail: null, icon: <FileText size={20} strokeWidth={2.2} />, bg: '#F5EFE6', fg: '#6B5E4E' }
}


/* ═════════════════════════════════════════════════════
   TAB ACTIVIDADES — vista filtrada de quizzes + assignments
   ═════════════════════════════════════════════════════ */

function ActivitiesTab({
  allItems, currentItemKey, onGoToItem,
  attemptsState, submissionsState, passingScore,
}: {
  allItems: Item[]
  currentItemKey?: string
  onGoToItem: (key: string) => void
  attemptsState: Record<string, any>
  submissionsState: Record<string, any>
  passingScore: number
}) {
  const activities = allItems.filter(i => i.type === 'quiz' || i.type === 'assignment')

  if (activities.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#8A7860', fontSize: 13 }}>
        Este curso no tiene actividades evaluables.
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ fontSize: 11, color: '#8A7860', marginBottom: 12 }}>
        {activities.filter(a => a.done).length} de {activities.length} completadas
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activities.map(item => {
          const isActive = item.key === currentItemKey
          const visual = getItemVisual(item)
          let status = 'Pendiente'
          let statusColor = '#8A7860'
          let statusBg = '#F5EFE6'

          if (item.type === 'quiz') {
            const a = attemptsState[item.id]
            if (a) {
              if (a.passed) {
                status = `${Math.round(a.score)}% · Aprobado`
                statusColor = '#0F6E56'
                statusBg = '#E1F5EE'
              } else {
                status = `${Math.round(a.score)}% · No aprobado`
                statusColor = '#993C1D'
                statusBg = '#FAECE7'
              }
            }
          } else if (item.type === 'assignment') {
            const s = submissionsState[item.id]
            if (s?.submitted_at) {
              if (s.score != null) {
                status = `${s.score}% · Calificado`
                statusColor = '#0F6E56'
                statusBg = '#E1F5EE'
              } else {
                status = 'Enviado · En revisión'
                statusColor = '#185FA5'
                statusBg = '#E6F1FB'
              }
            }
          }

          return (
            <button
              key={item.key}
              onClick={() => onGoToItem(item.key)}
              style={{
                background: isActive ? '#FAF5EB' : '#fff',
                border: `1px solid ${isActive ? '#1F1710' : 'rgba(31,23,16,0.08)'}`,
                borderRadius: 10,
                padding: 12,
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 6,
                background: visual.bg, color: visual.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {visual.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: '#1F1710',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginBottom: 4,
                }}>
                  {item.title}
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  background: statusBg, color: statusColor,
                  borderRadius: 100,
                  fontSize: 10, fontWeight: 700,
                }}>
                  {status}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


/* ═════════════════════════════════════════════════════
   TAB APUNTES — sistema de notas privadas
   ═════════════════════════════════════════════════════ */

function NotesTab({ currentItem, enrollmentId, previewMode }: {
  currentItem: Item | undefined
  enrollmentId: string
  previewMode: boolean
}) {
  const { showToast } = useToast()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [allNotes, setAllNotes] = useState<Array<{lesson_id: string; lesson_title: string; content: string; updated_at: string}>>([])

  const lessonId = currentItem?.type === 'lesson' ? currentItem.id : null
  const lessonTitle = currentItem?.type === 'lesson' ? currentItem.title : null

  // Cargar nota de la lección actual + lista global
  useEffect(() => {
    let alive = true
    async function load() {
      if (previewMode) {
        setLoading(false)
        setContent('')
        return
      }
      setLoading(true)
      const supabase = createClient()
      if (lessonId) {
        const { data } = await supabase
          .from('lesson_notes')
          .select('content')
          .eq('enrollment_id', enrollmentId)
          .eq('lesson_id', lessonId)
          .maybeSingle()
        if (alive) {
          setContent(data?.content || '')
          setLoading(false)
        }
      } else {
        if (alive) {
          setContent('')
          setLoading(false)
        }
      }
    }
    load()
    return () => { alive = false }
  }, [lessonId, enrollmentId, previewMode])

  // Cargar lista de todas las notas (al cambiar tab)
  useEffect(() => {
    if (previewMode) return
    async function loadAll() {
      const supabase = createClient()
      const { data } = await supabase
        .from('lesson_notes')
        .select('lesson_id, content, updated_at, lessons(title)')
        .eq('enrollment_id', enrollmentId)
        .order('updated_at', { ascending: false })
      if (data) {
        setAllNotes(data.map((n: any) => ({
          lesson_id: n.lesson_id,
          lesson_title: n.lessons?.title || '(sin título)',
          content: n.content,
          updated_at: n.updated_at,
        })))
      }
    }
    loadAll()
  }, [enrollmentId, previewMode, savedAt])

  // Auto-guardar al teclear (debounce)
  const debounceSave = useDebouncedCallback(async (val: string) => {
    if (!lessonId || previewMode) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('lesson_notes').upsert({
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      content: val,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'enrollment_id,lesson_id' })
    setSaving(false)
    setSavedAt(new Date())
  }, 800)

  if (previewMode) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#8A7860', fontSize: 13 }}>
        Vista previa: los apuntes solo están disponibles para alumnos matriculados.
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {lessonId ? (
        <>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <div style={{
              fontSize: 11, color: '#8A7860', fontWeight: 600,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              Apuntes de:
            </div>
            <div style={{ fontSize: 10, color: '#8A7860' }}>
              {saving ? 'Guardando…' : savedAt ? `Guardado · ${savedAt.toLocaleTimeString()}` : ''}
            </div>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#1F1710',
            marginBottom: 10,
          }}>
            {lessonTitle}
          </div>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              debounceSave(e.target.value)
            }}
            placeholder="Escribe tus apuntes aquí. Se guardan automáticamente."
            disabled={loading}
            style={{
              width: '100%',
              minHeight: 220,
              padding: 12,
              background: '#fff',
              border: '1px solid rgba(31,23,16,0.12)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              lineHeight: 1.55,
              color: '#1F1710',
              resize: 'vertical',
            }}
          />

          {allNotes.length > 0 && (
            <>
              <div style={{
                marginTop: 22, marginBottom: 10,
                fontSize: 11, color: '#8A7860', fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Otros apuntes ({allNotes.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allNotes.filter(n => n.lesson_id !== lessonId).slice(0, 5).map(n => (
                  <div key={n.lesson_id} style={{
                    padding: 10,
                    background: '#FAF7F2',
                    borderRadius: 8,
                    border: '1px solid rgba(31,23,16,0.04)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1F1710', marginBottom: 3 }}>
                      {n.lesson_title}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#6B5E4E',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                    }}>
                      {n.content || '(vacío)'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: '#8A7860', fontSize: 13 }}>
          Selecciona una lección para tomar apuntes.
        </div>
      )}
    </div>
  )
}

function useDebouncedCallback<T extends (...args: any[]) => any>(fn: T, delay: number) {
  const fnRef = useState({ current: fn })[0]
  fnRef.current = fn
  return useCallback((...args: Parameters<T>) => {
    const id = setTimeout(() => fnRef.current(...args), delay)
    return () => clearTimeout(id)
  }, [delay, fnRef])
}


/* ═════════════════════════════════════════════════════
   MAIN PLAYER — el área principal a la izquierda
   ═════════════════════════════════════════════════════ */

function MainPlayer({
  item, enrollmentId, previewMode, passingScore, currentIdx, totalItems,
  isCompleted, marking, onMarkComplete,
  onQuizSubmitted, onAssignmentSubmitted, onForumCompleted,
  prevItem, nextItem, onGoToItem,
  attemptForCurrentQuiz, submissionForCurrentAssignment,
}: {
  item: Item | undefined
  enrollmentId: string
  previewMode: boolean
  passingScore: number
  currentIdx: number
  totalItems: number
  isCompleted: boolean
  marking: boolean
  onMarkComplete: () => void
  onQuizSubmitted: (quizId: string, attempt: any) => void
  onAssignmentSubmitted: (assignmentId: string, sub: any) => void
  onForumCompleted: (forumId: string) => void
  prevItem: Item | null
  nextItem: Item | null
  onGoToItem: (key: string) => void
  attemptForCurrentQuiz: any
  submissionForCurrentAssignment: any
}) {
  if (!item) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#8A7860' }}>
        Este curso aún no tiene contenido.
      </div>
    )
  }

  return (
    <>
      {/* Player principal */}
      {item.type === 'lesson' && (
        <LessonPlayer
          lesson={item.data}
          currentIdx={currentIdx}
          totalItems={totalItems}
          previewMode={previewMode}
        />
      )}

      {item.type === 'quiz' && (
        previewMode
          ? <PreviewBanner kind="quiz" title={item.title} meta={item.meta || ''} />
          : (
            <div style={{
              background: '#fff',
              border: '1px solid rgba(31,23,16,0.08)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <QuizInline
                key={item.id}
                quizId={item.id}
                enrollmentId={enrollmentId}
                existingAttempt={attemptForCurrentQuiz}
                onSubmitted={(attempt) => onQuizSubmitted(item.id, attempt)}
              />
            </div>
          )
      )}

      {item.type === 'assignment' && (
        previewMode
          ? <PreviewBanner kind="assignment" title={item.title} meta={item.meta || ''} />
          : (
            <div style={{
              background: '#fff',
              border: '1px solid rgba(31,23,16,0.08)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <AssignmentInline
                key={item.id}
                assignment={item.data}
                enrollmentId={enrollmentId}
                existingSubmission={submissionForCurrentAssignment}
                onSubmitted={(sub) => onAssignmentSubmitted(item.id, sub)}
              />
            </div>
          )
      )}

      {item.type === 'resource' && (
        <ResourceViewer resource={item.data} />
      )}

      {item.type === 'forum' && (
        previewMode
          ? <PreviewBanner kind="forum" title={item.title} meta="" />
          : <ForumViewer forum={item.data} enrollmentId={enrollmentId} onCompleted={() => onForumCompleted(item.id)} />
      )}

      {/* Footer con navegación */}
      <div style={{
        marginTop: 28,
        padding: '20px 0 0',
        borderTop: '1px solid rgba(31,23,16,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          {prevItem && (
            <button
              onClick={() => onGoToItem(prevItem.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px',
                background: 'transparent',
                border: '1px solid rgba(31,23,16,0.15)',
                borderRadius: 100,
                fontSize: 13, fontWeight: 600, color: '#1F1710',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <ChevronLeft size={14} strokeWidth={2.2} />
              Anterior
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {item.type === 'lesson' && !isCompleted && !previewMode && (
            <button
              onClick={onMarkComplete}
              disabled={marking}
              style={{
                padding: '10px 18px',
                background: '#fff',
                color: '#0F6E56',
                border: '1.5px solid #0F6E56',
                borderRadius: 100,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {marking ? 'Guardando…' : '✓ Marcar como vista'}
            </button>
          )}

          {nextItem ? (
            <button
              onClick={() => onGoToItem(nextItem.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '11px 22px',
                background: '#1F1710', color: '#F4ECDF',
                border: 'none',
                borderRadius: 100,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Siguiente
              <SkipForward size={14} strokeWidth={2.2} />
            </button>
          ) : (
            <Link href={previewMode ? '/admin' : '/certificates'} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '11px 22px',
              background: '#E1F5EE', color: '#0F6E56',
              borderRadius: 100,
              fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
            }}>
              <Award size={14} strokeWidth={2.2} />
              {previewMode ? 'Volver al panel' : 'Fin del curso'}
            </Link>
          )}
        </div>
      </div>
    </>
  )
}


/* ═════════════════════════════════════════════════════
   LESSON PLAYER — video + título + descripción
   ═════════════════════════════════════════════════════ */

function LessonPlayer({ lesson, currentIdx, totalItems, previewMode }: {
  lesson: Lesson
  currentIdx: number
  totalItems: number
  previewMode: boolean
}) {
  const youtubeId = extractYouTubeId(lesson.video_url)
  const vimeoId = extractVimeoId(lesson.video_url)
  const hasVideo = !!(youtubeId || vimeoId)

  return (
    <div>
      {/* Video grande */}
      {hasVideo && (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 18,
        }}>
          {youtubeId && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
              title={lesson.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {vimeoId && (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              title={lesson.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      )}

      {/* Título y meta */}
      <div style={{
        fontSize: 11, color: '#8A7860', fontWeight: 600,
        letterSpacing: '0.04em', marginBottom: 4,
      }}>
        Clase {currentIdx + 1} de {totalItems}
        {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}
      </div>
      <h1 style={{
        fontSize: 26, fontWeight: 800, color: '#1F1710',
        letterSpacing: '-0.025em',
        marginBottom: 14, lineHeight: 1.2,
      }}>
        {lesson.title}
      </h1>

      {/* Contenido textual */}
      {lesson.content && (
        <div style={{
          padding: 20,
          background: '#fff',
          border: '1px solid rgba(31,23,16,0.08)',
          borderRadius: 10,
          fontSize: 14, color: '#3A2D20', lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {lesson.content}
        </div>
      )}

      {!hasVideo && !lesson.content && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: '#fff',
          border: '1px solid rgba(31,23,16,0.08)',
          borderRadius: 10,
          color: '#8A7860', fontSize: 13,
        }}>
          Esta lección aún no tiene video ni contenido.
        </div>
      )}

      {/* Comentarios estilo Edutin debajo de cada lección */}
      <LessonComments lessonId={lesson.id} previewMode={previewMode} />
    </div>
  )
}


/* ═════════════════════════════════════════════════════
   PREVIEW BANNER (admin viewing without enrollment)
   ═════════════════════════════════════════════════════ */

function PreviewBanner({ kind, title, meta }: {
  kind: 'quiz' | 'assignment' | 'forum'
  title: string
  meta: string
}) {
  const labels: Record<typeof kind, { name: string; tip: string }> = {
    quiz: { name: 'Cuestionario', tip: 'Los alumnos verán las preguntas y podrán responder. En vista previa no puedes responder.' },
    assignment: { name: 'Asignación', tip: 'Los alumnos verán las instrucciones y podrán enviar su respuesta.' },
    forum: { name: 'Foro', tip: 'Los alumnos podrán publicar y responder. En vista previa no puedes publicar.' },
  }
  const info = labels[kind]
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: '#fff',
      border: '1px solid rgba(31,23,16,0.08)',
      borderRadius: 12,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px',
        background: '#FFF3CD', color: '#7A5A0F',
        border: '1px solid #FFE08A',
        borderRadius: 100,
        fontSize: 11, fontWeight: 700,
        marginBottom: 16,
      }}>
        VISTA PREVIA
      </div>
      <div style={{
        fontSize: 11, color: '#8A7860', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 4,
      }}>
        {info.name}
      </div>
      <h2 style={{
        fontSize: 24, fontWeight: 700,
        color: '#1F1710',
        marginBottom: 8,
      }}>
        {title}
      </h2>
      {meta && (
        <div style={{ fontSize: 13, color: '#8A7860', marginBottom: 14 }}>
          {meta}
        </div>
      )}
      <p style={{
        fontSize: 13, color: '#6B5E4E',
        maxWidth: 480, margin: '0 auto', lineHeight: 1.6,
      }}>
        {info.tip}
      </p>
    </div>
  )
}


/* ═════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════ */

function extractYouTubeId(url: string | null): string | null {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/v\/([^?&\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function extractVimeoId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}
