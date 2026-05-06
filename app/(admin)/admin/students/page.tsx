
import { createClient } from '@/lib/supabase/server'
import StudentsManager from './StudentsManager'
export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, is_published')
    .eq('is_published', true)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, student_id, course_id, status')

  return (
    <div style={{ padding: '26px 32px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div className="admin-breadcrumb">
          <span>Panel de instructor</span>
          <span className="sep">/</span>
          <span className="current">Alumnos</span>
        </div>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Alumnos</h1>
        <p style={{ fontSize: 13, color: 'var(--a-ink-2)' }}>
          Asigna cursos a tus alumnos. Sin asignación no podrán acceder al contenido.
        </p>
      </div>

      <StudentsManager
        students={students || []}
        courses={courses || []}
        enrollments={enrollments || []}
      />
    </div>
  )
}
