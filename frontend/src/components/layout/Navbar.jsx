import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Sun, Moon, Menu, Globe, Search, X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotif } from '../../contexts/NotifContext'
import { markAsRead } from '../../api/notifications'
import { clsx } from 'clsx'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇲🇦', dir: 'rtl' },
]

export default function Navbar({ onMenuClick }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotif()
  const navigate = useNavigate()

  const [showNotifs, setShowNotifs]   = useState(false)
  const [showLang, setShowLang]       = useState(false)
  const [search, setSearch]           = useState('')
  const [showSearch, setShowSearch]   = useState(false)
  const [toggling, setToggling]       = useState(false)

  const notifRef = useRef(null)
  const langRef  = useRef(null)

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
      if (langRef.current  && !langRef.current.contains(e.target))  setShowLang(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLang = (code, dir) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
    document.documentElement.dir = dir || 'ltr'
    setShowLang(false)
  }

  const handleMarkRead = async (id) => {
    await markAsRead(id)
    fetchNotifications()
  }

  const handleToggleTheme = () => {
    setToggling(true)
    toggleTheme()
    setTimeout(() => setToggling(false), 500)
  }

  const currentLang = LANGS.find((l) => l.code === i18n.language) || LANGS[0]

  // Style commun pour les boutons de la navbar
  const navBtnStyle = {
    color: 'var(--muted-foreground)',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-16 backdrop-blur-md"
      style={{
        backgroundColor: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--navbar-border)',
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg transition-all"
        style={navBtnStyle}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
      >
        <Menu size={20} />
      </button>

      {/* Search bar */}
      <div className={clsx('flex-1 max-w-sm transition-all duration-300', showSearch ? 'flex' : 'hidden md:flex')}>
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--placeholder)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '…'}
            className="input-base pl-9"
            style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      <button
        onClick={() => setShowSearch(!showSearch)}
        className="md:hidden p-2 rounded-lg transition-all"
        style={navBtnStyle}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
      >
        {showSearch ? <X size={18} /> : <Search size={18} />}
      </button>

      <div className="ml-auto flex items-center gap-1.5">

        {/* ── Theme Toggle Button ─────────────────────────────── */}
        <button
          onClick={handleToggleTheme}
          className="theme-toggle"
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          aria-pressed={isDark}
        >
          <span
            className="toggle-icon"
            style={{
              transform: toggling ? 'rotate(360deg) scale(0.8)' : 'rotate(0deg) scale(1)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {isDark
              ? <Sun size={16} />
              : <Moon size={16} />
            }
          </span>
        </button>

        {/* ── Language selector ────────────────────────────────── */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm transition-all"
            style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{currentLang.flag}</span>
          </button>

          {showLang && (
            <div
              className="absolute right-0 top-full mt-2 w-40 rounded-xl shadow-lg overflow-hidden z-50 animate-slide-down"
              style={{
                backgroundColor: 'var(--modal)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-popup)',
              }}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLang(l.code, l.dir)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-all text-left"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {i18n.language === l.code && <Check size={14} className="ml-auto text-primary-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Notifications ────────────────────────────────────── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-xl transition-all"
            style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 animate-slide-down overflow-hidden"
              style={{
                backgroundColor: 'var(--modal)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-popup)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {t('notifications.title')}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-500 hover:text-primary-400 transition-colors"
                  >
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {t('notifications.empty')}
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className="px-4 py-3 cursor-pointer transition-all"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : 'rgba(59,130,246,0.03)'}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{n.title}</p>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{n.message}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--placeholder)' }}>
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => { navigate('/notifications'); setShowNotifs(false) }}
                  className="text-xs text-primary-500 hover:text-primary-400 transition-colors"
                >
                  {t('dashboard.viewAll')} →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User avatar ──────────────────────────────────────── */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>{user?.username}</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--muted-foreground)' }}>
              {user?.is_admin ? '👑 Admin' : 'User'}
            </p>
          </div>
        </button>

      </div>
    </header>
  )
}
