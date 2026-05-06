'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Bell, LogOut, LayoutDashboard, ExternalLink, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
  user: {
    email: string
    full_name?: string
    role: 'admin' | 'student'
  }
  hasAlert?: boolean
  onMenuClick?: () => void
}

export function AdminTopbar({ user, hasAlert, onMenuClick }: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <header className="admin-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onMenuClick && (
          <button onClick={onMenuClick} className="admin-iconbtn admin-menu-btn" aria-label="Menú">
            <Menu size={19} strokeWidth={2} />
          </button>
        )}
        <div className="admin-topbar-left">
          <span className="dot" />
          INSTRUCTOR
        </div>
      </div>

      <div className="admin-search">
        <Search />
        <input
          type="text"
          placeholder="Buscar curso, alumno o lección…"
          aria-label="Buscar"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link
          href="/"
          className="admin-iconbtn"
          aria-label="Ver sitio público"
          title="Ver sitio público"
          target="_blank"
        >
          <ExternalLink size={17} strokeWidth={2} />
        </Link>

        <button className="admin-iconbtn" aria-label="Notificaciones">
          <Bell size={17} strokeWidth={2} />
          {hasAlert && <span className="dot" />}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="admin-avatar"
            aria-label="Menú de usuario"
          >
            {initials}
          </button>

          {profileOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setProfileOpen(false)}
              />
              <div
                className="animate-scale-in"
                style={{
                  position: 'absolute', right: 0, marginTop: 8, width: 240,
                  background: '#fff', borderRadius: 10,
                  border: '1px solid var(--a-border)',
                  boxShadow: '0 10px 30px rgba(28,20,13,0.12)',
                  padding: '4px 0', zIndex: 50,
                }}
              >
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--a-border)',
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--a-ink)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {user.full_name || 'Usuario'}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--a-ink-2)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2,
                  }}>
                    {user.email}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', marginTop: 8,
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 4,
                    background: 'var(--a-surface-2)',
                    color: 'var(--a-brand)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    Instructor
                  </div>
                </div>

                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', fontSize: 13,
                    color: 'var(--a-ink)', textDecoration: 'none',
                  }}
                >
                  <LayoutDashboard size={15} strokeWidth={2} />
                  Mi panel
                </Link>

                <div style={{ height: 1, background: 'var(--a-border)', margin: '4px 0' }} />

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', fontSize: 13,
                    color: 'var(--a-warn)', background: 'transparent', border: 'none',
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  <LogOut size={15} strokeWidth={2} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
