import { useState } from 'react'
import { Settings, Moon, Sun, Globe, Bell, Shield, Save, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { clsx } from 'clsx'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
]

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { isDark, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)

  const handleLang = (code, dir) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
    document.documentElement.dir = dir || 'ltr'
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Settings size={24} className="text-primary-400" />
            {t('nav.settings')}
          </h1>
          <Button size="sm" icon={saved ? <Check size={14} /> : <Save size={14} />} onClick={handleSave}
            variant={saved ? 'success' : 'primary'}>
            {saved ? 'Sauvegardé !' : t('common.save')}
          </Button>
        </div>

        {/* Appearance */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
            {isDark ? <Moon size={16} /> : <Sun size={16} />} Apparence
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-dark-200">Mode sombre</p>
              <p className="text-xs text-dark-500">{isDark ? 'Interface sombre activée' : 'Interface claire activée'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: isDark ? '#3b82f6' : '#475569' }}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isDark ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
            <Globe size={16} /> Langue / Language
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLang(l.code, l.dir)}
                className={clsx(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                  i18n.language === l.code
                    ? 'bg-primary-500/10 border-primary-500/40 text-primary-400'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-500'
                )}
              >
                <span className="text-2xl">{l.flag}</span>
                <span className="text-xs font-medium">{l.label}</span>
                {i18n.language === l.code && (
                  <span className="w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
            <Shield size={16} /> Compte
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-500">Utilisateur</span>
              <span className="text-dark-200 font-medium">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-500">Rôle</span>
              <span className="text-dark-200 font-medium">{user?.is_admin ? '👑 Administrateur' : '👤 Utilisateur'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-500">Statut</span>
              <span className={user?.is_verified ? 'text-emerald-400' : 'text-amber-400'}>
                {user?.is_verified ? '✓ Vérifié' : '⏳ En attente'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
