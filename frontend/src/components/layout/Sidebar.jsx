import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, PlusCircle, Bell, Settings,
  ShieldCheck, LogOut, ChevronLeft, ChevronRight, X,
  Activity, Cpu, User2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { clsx } from 'clsx'

const navItems = (t, isAdmin) => [
  { to: '/dashboard',      icon: <LayoutDashboard size={18} />, label: t('nav.dashboard') },
  { to: '/vms',            icon: <Server size={18} />,          label: t('nav.vms') },
  { to: '/create',         icon: <PlusCircle size={18} />,      label: t('nav.createVm') },
  { to: '/notifications',  icon: <Bell size={18} />,            label: t('nav.activity') },
  ...(isAdmin ? [{ to: '/admin', icon: <ShieldCheck size={18} />, label: t('nav.admin') }] : []),
]

export default function Sidebar({ mobile, onClose }) {
  const { t } = useTranslation()
  const { user, logout, isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed)
  }, [collapsed])

  const handleLogout = async () => {
    await logout()
    toast.success(t('auth.logoutSuccess'))
    navigate('/login')
  }

  const items = navItems(t, isAdmin)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-5',
          collapsed && !mobile ? 'justify-center px-3' : ''
        )}
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-glow-sm">
          <Cpu size={18} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>Zorin VM</p>
            <p className="text-xs leading-tight" style={{ color: 'var(--muted-foreground)' }}>Cloud Platform</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg transition-all"
            style={{
              color: 'var(--muted-foreground)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--muted)'
              e.currentTarget.style.color = 'var(--foreground)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--muted-foreground)'
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) => clsx(
              'nav-item',
              isActive && 'active',
              collapsed && !mobile ? 'justify-center px-2' : ''
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <NavLink
          to="/settings"
          onClick={mobile ? onClose : undefined}
          className={({ isActive }) => clsx(
            'nav-item',
            isActive && 'active',
            collapsed && !mobile ? 'justify-center px-2' : ''
          )}
        >
          <Settings size={18} className="shrink-0" />
          {(!collapsed || mobile) && <span>{t('nav.settings')}</span>}
        </NavLink>

        <NavLink
          to="/profile"
          onClick={mobile ? onClose : undefined}
          className={({ isActive }) => clsx(
            'nav-item',
            isActive && 'active',
            collapsed && !mobile ? 'justify-center px-2' : ''
          )}
        >
          <User2 size={18} className="shrink-0" />
          {(!collapsed || mobile) && <span className="truncate">{user?.username}</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          className={clsx(
            'nav-item w-full',
            collapsed && !mobile ? 'justify-center px-2' : ''
          )}
          style={{ color: '#f87171' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#fca5a5'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#f87171'
          }}
        >
          <LogOut size={18} className="shrink-0" />
          {(!collapsed || mobile) && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </div>
  )

  if (mobile) {
    return sidebarContent
  }

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-screen sticky top-0',
        'backdrop-blur-md',
        'transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {sidebarContent}
    </aside>
  )
}

// Mobile sidebar overlay
export function MobileSidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Overlay */}
      <div
        className={clsx(
          'fixed inset-0 z-40 backdrop-blur-sm lg:hidden',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ backgroundColor: 'var(--overlay)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 lg:hidden',
          'transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        <Sidebar mobile onClose={onClose} />
      </div>
    </>
  )
}
