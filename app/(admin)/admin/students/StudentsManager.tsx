'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Search, Plus, X, Users, Mail } from 'lucide-react'

type Student = { id: string; email: string; full_name: string; created_at: string }
type Course = { id: string; title: string; is_published: boolean }
type Enrollment = { id: string; student_id: string; course_id: string; status: string }

export default function StudentsManager({
  students, courses, enrollments,
}: { students: Student[]; courses: Course[]; enrollments: Enrollment[] }) {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [localEnrollments, setLocalEnrollments] = useState(enrollments)
  const [saving, setSaving] = useState<string | null>(null)

  const filtered = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  function getStudentCourses(studentId: string) {
    return localEnrollments.filter(e => e.student_id === studentId)
  }

  async function toggleEnrollment(studentId: string, courseId: string, courseTitle: string) {
    setSaving(courseId)
    const supabase = createClient()
    const existing = localEnrollments.find(e => e.student_id === studentId && e.course_id === courseId)

    if (existing) {
      await supabase.from('enrollments').delete().eq('id', existing.id)
      setLocalEnrollments(localEnrollments.filter(e => e.id !== existing.id))
      showToast(`Acceso a "${courseTitle}" revocado`, 'info')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: newEnrollment } = await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          course_id: courseId,
          assigned_by: user!.id,
          status: 'active',
        })
        .select()
        .single()

      if (newEnrollment) {
        setLocalEnrollments([...localEnrollments, newEnrollment as any])
        showToast(`Acceso a "${courseTitle}" concedido`, 'success')
      }
    }
    setSaving(null)
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 16,
    }} className="students-grid">

      <div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search
            size={14}
            strokeWidth={2.5}
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--a-ink-4)',
            }}
          />
          <input
            type="text"
            placeholder="Buscar alumno…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--a-ink-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 8,
          padding: '0 4px',
        }}>
          {filtered.length} {filtered.length === 1 ? 'alumno' : 'alumnos'}
        </div>

        <div className="card" style={{ maxHeight: 560, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontSize: 13, color: 'var(--a-ink-3)',
            }}>
              {search ? 'Sin resultados' : 'Sin alumnos registrados'}
            </div>
          ) : filtered.map((student, idx) => {
            const count = getStudentCourses(student.id).length
            const isSelected = selectedStudent?.id === student.id
            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: isSelected ? 'var(--a-surface-2)' : 'transparent',
                  border: 'none',
                  borderLeft: isSelected ? '3px solid var(--a-brand)' : '3px solid transparent',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--a-border)' : 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--a-surface)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--a-side-bg)',
                  color: 'var(--cream)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {(student.full_name || student.email)[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--a-ink)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {student.full_name || 'Sin nombre'}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--a-ink-3)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {student.email}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 100,
                  background: count > 0 ? 'var(--a-ok-50)' : 'var(--a-surface)',
                  color: count > 0 ? 'var(--a-ok)' : 'var(--a-ink-3)',
                  whiteSpace: 'nowrap',
                }}>
                  {count} {count === 1 ? 'curso' : 'cursos'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {!selectedStudent ? (
          <EmptySelection hasStudents={students.length > 0} />
        ) : (
          <div className="card">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px',
              borderBottom: '1px solid var(--a-border)',
              background: 'var(--a-surface)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--a-side-bg)',
                color: 'var(--cream)',
                display: 'grid', placeItems: 'center',
                fontSize: 16, fontWeight: 700,
                flexShrink: 0,
              }}>
                {(selectedStudent.full_name || selectedStudent.email)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: 'var(--a-ink)',
                  letterSpacing: '-0.015em', marginBottom: 2,
                }}>
                  {selectedStudent.full_name || 'Sin nombre'}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--a-ink-2)',
                }}>
                  <Mail size={12} strokeWidth={2} />
                  {selectedStudent.email}
                </div>
              </div>
            </div>

            <div style={{ padding: '18px 20px 8px' }}>
              <h3 style={{
                fontSize: 13, fontWeight: 700, color: 'var(--a-ink)',
                letterSpacing: '-0.01em', marginBottom: 12,
              }}>
                Cursos asignados
              </h3>

              {courses.length === 0 ? (
                <div style={{
                  padding: '28px 16px', textAlign: 'center',
                  fontSize: 13, color: 'var(--a-ink-3)',
                  background: 'var(--a-surface)',
                  borderRadius: 8,
                }}>
                  No hay cursos publicados aún. Crea y publica un curso primero.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {courses.map((course) => {
                    const isEnrolled = !!getStudentCourses(selectedStudent.id).find(e => e.course_id === course.id)
                    const isSaving = saving === course.id
                    return (
                      <div
                        key={course.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 14px',
                          borderRadius: 8,
                          border: '1px solid',
                          borderColor: isEnrolled ? 'var(--a-border-2)' : 'var(--a-border)',
                          background: isEnrolled ? 'var(--a-surface)' : '#fff',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--a-ink)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {course.title}
                          </div>
                          <div style={{
                            fontSize: 11, fontWeight: 500,
                            color: isEnrolled ? 'var(--a-ok)' : 'var(--a-ink-3)',
                          }}>
                            {isEnrolled ? '✓ Con acceso' : 'Sin acceso'}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleEnrollment(selectedStudent.id, course.id, course.title)}
                          disabled={isSaving}
                          className={isEnrolled ? 'btn-danger' : 'btn-primary'}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          {isSaving ? '...' : isEnrolled ? (
                            <><X size={12} strokeWidth={2.5} /> Quitar</>
                          ) : (
                            <><Plus size={12} strokeWidth={2.5} /> Asignar</>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .students-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function EmptySelection({ hasStudents }: { hasStudents: boolean }) {
  return (
    <div className="card" style={{
      padding: '48px 24px',
      textAlign: 'center',
      background: 'var(--a-surface)',
      borderStyle: 'dashed',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: '#fff',
        color: 'var(--a-brand)',
        display: 'grid', placeItems: 'center',
        margin: '0 auto 14px',
        border: '1px solid var(--a-border)',
      }}>
        <Users size={22} strokeWidth={2} />
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 700, color: 'var(--a-ink)',
        letterSpacing: '-0.015em', marginBottom: 4,
      }}>
        {hasStudents ? 'Selecciona un alumno' : 'Aún no hay alumnos'}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--a-ink-2)', maxWidth: 360, margin: '0 auto' }}>
        {hasStudents
          ? 'Elige un alumno de la lista para ver y asignar sus cursos.'
          : 'Cuando haya alumnos registrados, aparecerán aquí y podrás asignarles cursos.'}
      </p>
    </div>
  )
}
