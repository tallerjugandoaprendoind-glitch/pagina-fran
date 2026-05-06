'use client'
import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'

type Props = {
  user: { email: string; full_name?: string; role: 'admin' | 'student' }
  hasAlert: boolean
  counts: { courses: number; students: number; pendingReviews: number; certificates: number }
  children: React.ReactNode
}

export function AdminShell({ user, hasAlert, counts, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="admin-shell">
      <AdminSidebar counts={counts} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,.35)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="admin-main">
        <AdminTopbar user={user} hasAlert={hasAlert} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main>{children}</main>
      </div>
    </div>
  )
}
