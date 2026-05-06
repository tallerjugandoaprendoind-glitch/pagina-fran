'use client'

/**
 * ModuleItemsDnd — lista drag-and-drop unificada de items por módulo.
 *
 * Muestra lecciones, quizzes, asignaciones, recursos y foros
 * en un solo listado ordenable. La numeración (1.1, 1.2, 1.3…)
 * refleja el order real en la BD, incluyendo todos los tipos.
 *
 * REQUISITO: la migración `migration.sql` debe haberse ejecutado
 * para que quizzes, assignments y course_forums tengan columna "order".
 */

import { useState, useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  GripVertical, PlayCircle, FileText, ClipboardList,
  FileArchive, MessageCircle, CheckCircle2,
} from 'lucide-react'

export type ItemType = 'lesson' | 'quiz' | 'assignment' | 'resource' | 'forum'

export type UnifiedItem = {
  key: string       // "lesson:uuid" | "quiz:uuid" | etc.
  type: ItemType
  id: string        // UUID en su tabla original
  title: string
  meta: string      // e.g. "10 min", "2 preguntas · 80%", etc.
  order: number     // posición global dentro del módulo
}

type Props = {
  moduleIndex: number          // índice del módulo (0-based) para la numeración
  moduleId: string
  initialItems: UnifiedItem[]
  onReordered?: (items: UnifiedItem[]) => void  // callback opcional tras guardar
}

export default function ModuleItemsDnd({
  moduleIndex,
  moduleId,
  initialItems,
  onReordered,
}: Props) {
  const { showToast } = useToast()
  const [items, setItems] = useState<UnifiedItem[]>(
    [...initialItems].sort((a, b) => a.order - b.order)
  )
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setItems([...initialItems].sort((a, b) => a.order - b.order))
  }, [initialItems])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = items.findIndex(i => i.key === active.id)
    const newIdx = items.findIndex(i => i.key === over.id)
    if (oldIdx < 0 || newIdx < 0) return

    const reordered = arrayMove(items, oldIdx, newIdx).map((it, idx) => ({
      ...it,
      order: idx,
    }))
    setItems(reordered)

    setSaving(true)
    const supabase = createClient()

    const tableFor: Record<ItemType, string> = {
      lesson:     'lessons',
      quiz:       'quizzes',
      assignment: 'assignments',
      resource:   'course_resources',
      forum:      'course_forums',
    }

    const results = await Promise.all(
      reordered.map(it =>
        supabase
          .from(tableFor[it.type])
          .update({ order: it.order })
          .eq('id', it.id)
      )
    )

    setSaving(false)
    const err = results.find(r => r.error)
    if (err) {
      showToast('Error al guardar el orden: ' + err.error!.message, 'error')
    } else {
      showToast('Orden guardado', 'success')
      onReordered?.(reordered)
    }
  }

  if (items.length === 0) {
    return (
      <div style={{
        padding: 14,
        background: 'var(--a-surface)',
        border: '1px dashed var(--a-border-2)',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--a-ink-3)',
      }}>
        Este módulo aún no tiene items para ordenar.
      </div>
    )
  }

  return (
    <div>
      {saving && (
        <div style={{
          fontSize: 11, color: 'var(--a-brand)', fontWeight: 600,
          marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            display: 'inline-block',
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--a-brand)',
            animation: 'pulse 1s infinite',
          }} />
          Guardando orden…
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.key)}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item, idx) => (
              <SortableItemRow
                key={item.key}
                item={item}
                numbering={`${moduleIndex + 1}.${idx + 1}`}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}


/* ─── Fila sortable ─── */

function SortableItemRow({
  item,
  numbering,
}: {
  item: UnifiedItem
  numbering: string
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.key })

  const visual = getItemVisual(item.type)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        background: isDragging ? 'var(--a-surface)' : '#fff',
        border: `1px solid ${isDragging ? 'var(--a-brand)' : 'var(--a-border)'}`,
        borderRadius: 8,
        padding: '9px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'default',
        boxShadow: isDragging ? '0 4px 16px rgba(31,23,16,0.12)' : 'none',
      }}
    >
      {/* Handle de arrastre */}
      <button
        {...attributes}
        {...listeners}
        title="Arrastrar para reordenar"
        style={{
          background: 'transparent',
          border: 'none',
          padding: '4px 2px',
          cursor: 'grab',
          color: 'var(--a-ink-4)',
          display: 'grid',
          placeItems: 'center',
          touchAction: 'none',
          flexShrink: 0,
        }}
      >
        <GripVertical size={14} strokeWidth={2.2} />
      </button>

      {/* Número */}
      <span style={{
        fontSize: 10, fontWeight: 800,
        color: 'var(--a-ink-3)',
        letterSpacing: '0.06em',
        background: 'var(--a-surface-2)',
        padding: '2px 7px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {numbering}
      </span>

      {/* Ícono tipo */}
      <div style={{
        width: 26, height: 26, borderRadius: 5,
        background: visual.bg, color: visual.fg,
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
      }}>
        {visual.icon}
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--a-ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.title || 'Sin título'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--a-ink-3)' }}>
          {visual.label}
          {item.meta ? ` · ${item.meta}` : ''}
        </div>
      </div>
    </div>
  )
}


/* ─── Visual por tipo ─── */

function getItemVisual(type: ItemType) {
  switch (type) {
    case 'lesson':
      return {
        icon: <PlayCircle size={13} strokeWidth={2.2} />,
        bg: '#FAEEDA', fg: '#854F0B', label: 'Lección',
      }
    case 'quiz':
      return {
        icon: <FileText size={13} strokeWidth={2.2} />,
        bg: '#E1F5EE', fg: '#0F6E56', label: 'Cuestionario',
      }
    case 'assignment':
      return {
        icon: <ClipboardList size={13} strokeWidth={2.2} />,
        bg: '#FAECE7', fg: '#993C1D', label: 'Asignación',
      }
    case 'resource':
      return {
        icon: <FileArchive size={13} strokeWidth={2.2} />,
        bg: '#EEEDFE', fg: '#534AB7', label: 'Recurso',
      }
    case 'forum':
      return {
        icon: <MessageCircle size={13} strokeWidth={2.2} />,
        bg: '#E6F1FB', fg: '#185FA5', label: 'Foro',
      }
  }
}
