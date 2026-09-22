import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Server, PlusCircle, Bell, Settings,
  ShieldCheck, LogOut, ChevronLeft, ChevronRight, Menu, X,
  Activity, Cpu, User2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { clsx } from 'clsx'

const navItems = (t, isAdmin) => [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: t('nav.dashboard') },
  { to: '/vms', icon: <Server size={18} />, label: t('nav.vms') },
  { to: '/create', icon: <PlusCircle size={18} />, label: t('nav.createVm') },
  { to: '/notifications', icon: <Bell size={18} />, label: t('nav.activity') },
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
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-dark-800',
        collapsed && !mobile ? 'justify-center px-3' : ''
      )}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-glow-sm">
          <Cpu size={18} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-bold text-dark-100 leading-tight">Zorin VM</p>
            <p className="text-xs text-dark-500 leading-tight">Cloud Platform</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg text-dark-500 hover:text-dark-200 hover:bg-dark-800 transition-all"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-lg text-dark-500 hover:text-dark-200 transition-all"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
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
      <div className="border-t border-dark-800 p-3 space-y-1">
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
            'nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10',
            collapsed && !mobile ? 'justify-center px-2' : ''
          )}
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
    <aside className={clsx(
      'hidden lg:flex flex-col h-screen sticky top-0',
      'bg-dark-900/80 backdrop-blur-md border-r border-dark-800',
      'transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
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
          'fixed inset-0 z-40 bg-dark-950/70 backdrop-blur-sm lg:hidden',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      {/* Drawer */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-700 lg:hidden',
        'transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar mobile onClose={onClose} />
      </div>
    </>
  )
}
