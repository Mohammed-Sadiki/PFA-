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
      <div className={clsx('flex-1 max-w-xs transition-all duration-300', showSearch ? 'flex' : 'hidden md:flex')}>
        <div className="relative w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/90 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <Globe size={15} className="text-slate-500" />
            <span>{currentLang.code.toUpperCase()}</span>
          </button>

          {showLang && (
            <div
              className="absolute right-0 top-full mt-2 w-40 rounded-xl shadow-lg overflow-hidden z-50 animate-slide-down bg-white border border-slate-200"
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLang(l.code, l.dir)}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all text-left"
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {i18n.language === l.code && <Check size={14} className="ml-auto text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Notifications ────────────────────────────────────── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 animate-slide-down overflow-hidden bg-white border border-slate-200 shadow-xl"
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  {t('notifications.title')}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    {t('notifications.empty')}
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className="px-4 py-3 cursor-pointer transition-all border-b border-slate-50 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs mt-0.5 text-slate-500 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] mt-1 text-slate-400">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                <button
                  onClick={() => { navigate('/notifications'); setShowNotifs(false) }}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
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
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold leading-tight text-slate-900">{user?.username || 'admin'}</p>
            <p className="text-[10px] font-medium leading-tight text-slate-400">
              {user?.is_admin ? '👑 Admin' : 'User'}
            </p>
          </div>
        </button>

      </div>
    </header>
  )
}
