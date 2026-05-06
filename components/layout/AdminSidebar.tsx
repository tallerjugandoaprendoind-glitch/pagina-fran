'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  Award,
  BarChart3,
  Newspaper,
} from 'lucide-react'

type Props = {
  counts?: {
    courses?: number
    students?: number
    pendingReviews?: number
    certificates?: number
  }
  open?: boolean
  onClose?: () => void
}

export function AdminSidebar({ counts, open, onClose }: Props) {
  const pathname = usePathname()

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/')

  return (
    <aside className={`admin-sidebar${open ? ' open' : ''}`}>
      <div className="admin-sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', marginLeft: 'auto', display: 'none' }} className="sidebar-close-btn">✕</button>
        )}
        <Link href="/admin" style={{ textDecoration: 'none' }}>
          <div className="admin-sidebar-brand-logo">
            capy<span className="accent">ABA</span>
          </div>
          <div className="admin-sidebar-brand-role">Panel instructor</div>
        </Link>
      </div>

      <div className="admin-sidebar-section-label">Principal</div>

      <Link href="/admin" className={`admin-sidebar-item ${isActive('/admin', true) ? 'active' : ''}`}>
        <span className="label">
          <LayoutDashboard size={15} strokeWidth={2} />
          Dashboard
        </span>
      </Link>

      <Link
        href="/admin/courses"
        className={`admin-sidebar-item ${pathname?.startsWith('/admin/courses') ? 'active' : ''}`}
      >
        <span className="label">
          <BookOpen size={15} strokeWidth={2} />
          Cursos
        </span>
        {counts?.courses !== undefined && counts.courses > 0 && (
          <span className="count">{counts.courses}</span>
        )}
      </Link>

      <Link
        href="/admin/students"
        className={`admin-sidebar-item ${isActive('/admin/students') ? 'active' : ''}`}
      >
        <span className="label">
          <Users size={15} strokeWidth={2} />
          Alumnos
        </span>
        {counts?.students !== undefined && counts.students > 0 && (
          <span className="count">{counts.students}</span>
        )}
      </Link>

      <Link
        href="/admin/reviews"
        className={`admin-sidebar-item ${isActive('/admin/reviews') ? 'active' : ''}`}
      >
        <span className="label">
          <ClipboardCheck size={15} strokeWidth={2} />
          Revisiones
        </span>
        {counts?.pendingReviews !== undefined && counts.pendingReviews > 0 && (
          <span className="pill">{counts.pendingReviews}</span>
        )}
      </Link>

      <Link
        href="/admin/certificates"
        className={`admin-sidebar-item ${isActive('/admin/certificates') ? 'active' : ''}`}
      >
        <span className="label">
          <Award size={15} strokeWidth={2} />
          Certificados
        </span>
        {counts?.certificates !== undefined && counts.certificates > 0 && (
          <span className="count">{counts.certificates}</span>
        )}
      </Link>

      <Link
        href="/admin/blog"
        className={`admin-sidebar-item ${isActive('/admin/blog') ? 'active' : ''}`}
      >
        <span className="label">
          <Newspaper size={15} strokeWidth={2} />
          Blog
        </span>
      </Link>

      <div className="admin-sidebar-section-label">Análisis</div>

      <Link
        href="/admin/stats"
        className={`admin-sidebar-item ${isActive('/admin/stats') ? 'active' : ''}`}
      >
        <span className="label">
          <BarChart3 size={15} strokeWidth={2} />
          Estadísticas
        </span>
      </Link>
    </aside>
  )
}
