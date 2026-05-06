import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('email, full_name, role').eq('id', user.id).single()

  // Si es admin, normalmente redirigimos al panel.
  // EXCEPCIÓN: si está en /learn/[id] queremos permitirle entrar
  // en modo "vista previa" del curso.
  if (profile?.role === 'admin') {
    const pathname = headers().get('x-pathname') || ''
    const isPreviewLearn = pathname.startsWith('/learn/')

    if (!isPreviewLearn) {
      redirect('/admin')
    }
    // Si está en /learn/[id], dejamos pasar (vista previa).
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={profile as any} />
      <main>{children}</main>
    </div>
  )
}
