import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/layout/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('email, full_name, role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { count: coursesCount },
    { count: studentsCount },
    { count: pendingReviews },
    { count: certificatesCount },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('needs_review', true),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
  ])

  return (
    <AdminShell
      user={profile as any}
      hasAlert={(pendingReviews || 0) > 0}
      counts={{
        courses: coursesCount || 0,
        students: studentsCount || 0,
        pendingReviews: pendingReviews || 0,
        certificates: certificatesCount || 0,
      }}
    >
      {children}
    </AdminShell>
  )
}
