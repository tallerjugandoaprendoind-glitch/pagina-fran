'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Bell, Menu, X, LogOut, BookOpen, Award, LayoutDashboard } from 'lucide-react'
import { CapyLogoText } from '@/components/ui/CapyLogo'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const SOCIAL_LINKS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/51940428169',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    label: 'Gmail',
    href: 'mailto:capyaba@gmail.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/capyaba/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@capyaba',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61560689756278',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
]

type Props = {
  user?: {
    email: string
    full_name?: string
    role: 'admin' | 'student'
  } | null
}

export function Navbar({ user }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email[0].toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ink-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-8 min-w-0">
            <Link
              href={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'}
              className="flex-shrink-0"
            >
              <CapyLogoText size="md" />
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {user.role === 'admin' ? (
                  <>
                    <NavLink href="/admin" active={pathname === '/admin'}>Dashboard</NavLink>
                    <NavLink href="/admin/students" active={pathname?.startsWith('/admin/students')}>Alumnos</NavLink>
                    <NavLink href="/admin/reviews" active={pathname?.startsWith('/admin/reviews')}>Revisiones</NavLink>
                  </>
                ) : (
                  <>
                    <NavLink href="/dashboard" active={pathname === '/dashboard'}>Mi aprendizaje</NavLink>
                    <NavLink href="/catalog" active={pathname === '/catalog'}>Catálogo</NavLink>
                    <NavLink href="/certificates" active={pathname === '/certificates'}>Certificados</NavLink>
                  </>
                )}
              </nav>
            )}
          </div>

          {user && (
            <div className="hidden lg:flex flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="text"
                  placeholder="¿Qué deseas aprender?"
                  className="w-full pl-10 pr-4 py-2 bg-ink-100 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-ink-300 focus:ring-2 focus:ring-brand-100 transition"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <>
                <button
                  className="hidden sm:flex p-2 rounded-full hover:bg-ink-100 transition focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  aria-label="Notificaciones"
                >
                  <Bell className="w-5 h-5 text-ink-600" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="w-9 h-9 rounded-full bg-mocha-600 text-white flex items-center justify-center text-sm font-semibold hover:bg-mocha-700 transition focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:outline-none"
                    aria-label="Menú de usuario"
                  >
                    {initials}
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg border border-ink-200 shadow-card-hover py-1 z-50 animate-scale-in">
                        <div className="px-4 py-3 border-b border-ink-100">
                          <p className="text-sm font-semibold truncate text-ink-900">{user.full_name || 'Usuario'}</p>
                          <p className="text-xs text-ink-500 truncate">{user.email}</p>
                          <span className={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            user.role === 'admin'
                              ? 'bg-mocha-100 text-mocha-800'
                              : 'bg-brand-50 text-brand-700'
                          }`}>
                            {user.role === 'admin' ? 'Instructor' : 'Alumno'}
                          </span>
                        </div>
                        <Link
                          href={user.role === 'admin' ? '/admin' : '/dashboard'}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                        >
                          <LayoutDashboard className="w-4 h-4" /> Mi panel
                        </Link>
                        {user.role === 'student' && (
                          <Link
                            href="/certificates"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                          >
                            <Award className="w-4 h-4" /> Certificados
                          </Link>
                        )}
                        <div className="h-px bg-ink-100 my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 w-full text-left text-red-600 font-medium"
                        >
                          <LogOut className="w-4 h-4" /> Cerrar sesión
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-1 mr-1">
                  {SOCIAL_LINKS.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target={s.href.startsWith('mailto') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="p-2 rounded-full text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
                <Link href="/login" className="btn-ghost hidden sm:flex">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="btn-primary">
                  Registrarme
                </Link>
              </>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-ink-100 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              aria-label="Menú"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && user && (
          <div className="md:hidden border-t border-ink-200 py-3 space-y-1 animate-fade-in">
            {user.role === 'admin' ? (
              <>
                <MobileLink href="/admin">Dashboard</MobileLink>
                <MobileLink href="/admin/students">Alumnos</MobileLink>
                <MobileLink href="/admin/reviews">Revisiones</MobileLink>
              </>
            ) : (
              <>
                <MobileLink href="/dashboard">Mi aprendizaje</MobileLink>
                <MobileLink href="/catalog">Catálogo</MobileLink>
                <MobileLink href="/certificates">Certificados</MobileLink>
              </>
            )}
          </div>
        )}

        {menuOpen && !user && (
          <div className="md:hidden border-t border-ink-200 py-3 animate-fade-in">
            <p className="px-3 py-1 text-xs font-semibold text-ink-400 uppercase tracking-wide">Redes sociales</p>
            <div className="flex items-center gap-1 px-2 pt-1">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="p-2 rounded-full text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-semibold rounded-md transition ${
        active
          ? 'text-brand-700 bg-brand-50'
          : 'text-ink-700 hover:bg-ink-100'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 rounded-md">
      {children}
    </Link>
  )
}
