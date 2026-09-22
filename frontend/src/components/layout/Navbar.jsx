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
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
]

export default function Navbar({ onMenuClick }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotif()
  const navigate = useNavigate()

  const [showNotifs, setShowNotifs] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const notifRef = useRef(null)
  const langRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
      if (langRef.current && !langRef.current.contains(e.target)) setShowLang(false)
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

  const currentLang = LANGS.find((l) => l.code === i18n.language) || LANGS[0]

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-16
      bg-dark-950/80 backdrop-blur-md border-b border-dark-800">

      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Search bar */}
      <div className={clsx(
        'flex-1 max-w-sm transition-all duration-300',
        showSearch ? 'flex' : 'hidden md:flex'
      )}>
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '…'}
            className="w-full bg-dark-800/60 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-sm
              text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500/50
              focus:ring-1 focus:ring-primary-500/30 transition-all"
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      <button
        onClick={() => setShowSearch(!showSearch)}
        className="md:hidden p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all"
      >
        {showSearch ? <X size={18} /> : <Search size={18} />}
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Dark / Light mode */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Language selector */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-dark-400 hover:text-dark-100
              hover:bg-dark-800 transition-all text-sm"
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{currentLang.flag}</span>
          </button>
          {showLang && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-dark-800 border border-dark-700
              rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLang(l.code, l.dir)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-dark-300
                    hover:bg-dark-700 hover:text-dark-100 transition-all"
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {i18n.language === l.code && <Check size={14} className="ml-auto text-primary-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 text-white
                text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700
              rounded-2xl shadow-2xl z-50 animate-slide-down overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
                <h3 className="text-sm font-semibold text-dark-100">{t('notifications.title')}</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-dark-700">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-dark-500">
                    {t('notifications.empty')}
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={clsx(
                        'px-4 py-3 cursor-pointer hover:bg-dark-700/50 transition-all',
                        !n.is_read && 'bg-primary-500/5'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-dark-200 truncate">{n.title}</p>
                          <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-dark-600 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-dark-700">
                <button
                  onClick={() => { navigate('/notifications'); setShowNotifs(false) }}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {t('dashboard.viewAll')} →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-dark-800 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700
            flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-dark-100 leading-tight">{user?.username}</p>
            <p className="text-[10px] text-dark-500 leading-tight">
              {user?.is_admin ? '👑 Admin' : 'User'}
            </p>
          </div>
        </button>
      </div>
    </header>
  )
}
