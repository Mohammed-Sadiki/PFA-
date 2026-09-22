import { useState } from 'react'
import { Settings, Moon, Sun, Globe, Shield, Save, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { clsx } from 'clsx'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇲🇦', dir: 'rtl' },
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
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Settings size={24} className="text-primary-500" />
            {t('nav.settings')}
          </h1>
          <Button
            size="sm"
            icon={saved ? <Check size={14} /> : <Save size={14} />}
            onClick={handleSave}
            variant={saved ? 'success' : 'primary'}
          >
            {saved ? 'Sauvegardé !' : t('common.save')}
          </Button>
        </div>

        {/* Appearance */}
        <div
          className="rounded-2xl p-5 space-y-4 transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            {isDark ? <Moon size={16} /> : <Sun size={16} />} Apparence
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm" style={{ color: 'var(--foreground)' }}>Mode sombre</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {isDark ? 'Interface sombre activée' : 'Interface claire activée'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: isDark ? 'var(--primary)' : 'var(--muted-foreground)' }}
            >
              <span
                className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300',
                  isDark ? 'translate-x-6' : ''
                )}
              />
            </button>
          </div>
        </div>

        {/* Language */}
        <div
          className="rounded-2xl p-5 space-y-4 transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Globe size={16} /> Langue / Language
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLang(l.code, l.dir)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: i18n.language === l.code ? 'var(--primary-bg)' : 'var(--muted)',
                  border: `1px solid ${i18n.language === l.code ? 'var(--primary-border)' : 'var(--border)'}`,
                  color: i18n.language === l.code ? 'var(--primary)' : 'var(--muted-foreground)'
                }}
                onMouseEnter={e => {
                  if (i18n.language !== l.code) {
                    e.currentTarget.style.borderColor = 'var(--border-strong)'
                    e.currentTarget.style.color = 'var(--foreground)'
                  }
                }}
                onMouseLeave={e => {
                  if (i18n.language !== l.code) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--muted-foreground)'
                  }
                }}
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
        <div
          className="rounded-2xl p-5 space-y-4 transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Shield size={16} /> Compte
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-foreground)' }}>Utilisateur</span>
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-foreground)' }}>Rôle</span>
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                {user?.is_admin ? '👑 Administrateur' : '👤 Utilisateur'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-foreground)' }}>Statut</span>
              <span style={{ color: user?.is_verified ? 'var(--success)' : 'var(--warning)' }}>
                {user?.is_verified ? '✓ Vérifié' : '⏳ En attente'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
