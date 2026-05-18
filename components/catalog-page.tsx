// app/(student)/catalog/page.tsx  — Server Component
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import CatalogClient from '@/components/CatalogClient'

export default async function CatalogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: allCourses } = await adminClient
    .from('courses')
    .select('id, title, description, cover_url, passing_score, is_published, intro_title, intro_video_url, price, price_label')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const { data: myEnrollments } = await supabase
    .from('enrollments')
    .select('course_id, status')
    .eq('student_id', user!.id)

  const enrolledIds = new Set((myEnrollments || []).map((e) => e.course_id))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-ink-900 tracking-tight mb-1">
          Catálogo de cursos
        </h1>
        <p className="text-ink-600">
          Adquiere tus cursos de forma segura con PayPal o tarjeta.
        </p>
      </div>

      <CatalogClient allCourses={allCourses || []} enrolledIds={enrolledIds} />
    </div>
  )
}
