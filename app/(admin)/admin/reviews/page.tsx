
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CapyMascot } from '@/components/ui/CapyLogo'
import { ChevronRight, FileText, User } from 'lucide-react'
export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('quiz_attempts')
    .select(`
      id, submitted_at,
      quizzes ( title, type ),
      enrollments ( profiles:student_id ( full_name, email ) )
    `)
    .eq('needs_review', true)
    .order('submitted_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <p className="text-xs text-ink-500 uppercase tracking-wider mb-1 font-semibold">Pendientes</p>
        <h1 className="text-3xl lg:text-4xl font-bold text-ink-900 tracking-tight mb-1 tracking-tight">
          Revisiones
        </h1>
        <p className="text-ink-600">
          Ensayos y respuestas abiertas que requieren tu revisión manual
        </p>
      </div>

      {!pending?.length ? (
        <div className="text-center py-16 bg-mocha-50 rounded-xl border border-mocha-100">
          <CapyMascot size={140} className="mx-auto mb-4" />
          <h3 className="text-xl font-bold text-ink-900 mb-2 tracking-tight">
            ¡Todo al día!
          </h3>
          <p className="text-ink-600 max-w-sm mx-auto text-sm">
            No hay respuestas pendientes de revisión
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 shadow-card">
          {pending.map((attempt: any) => (
            <Link
              key={attempt.id}
              href={`/admin/reviews/${attempt.id}`}
              className="flex items-center gap-4 p-5 hover:bg-ink-50 transition group"
            >
              <div className="w-10 h-10 bg-mocha-100 text-mocha-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900 truncate">
                  {attempt.quizzes?.title || 'Examen'}
                </p>
                <div className="flex items-center gap-2 text-xs text-ink-500 mt-1 font-medium">
                  <User className="w-3 h-3" />
                  {attempt.enrollments?.profiles?.full_name || attempt.enrollments?.profiles?.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500 hidden sm:inline font-medium">
                  Enviado {new Date(attempt.submitted_at).toLocaleDateString('es-ES')}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-ink-600 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
