import { useState } from 'react'
import { User2, Mail, ShieldCheck, Calendar, Key, Server, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { clsx } from 'clsx'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success(t('auth.logoutSuccess'))
    navigate('/login')
  }

  if (!user) return null

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{t('nav.profile')}</h1>

        {/* Avatar card */}
        <div
          className="rounded-2xl p-6 flex items-center gap-5 transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{user.username}</h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {user.is_admin && (
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: 'var(--warning)',
                    backgroundColor: 'var(--warning-bg)',
                    border: '1px solid var(--warning-border)',
                  }}
                >
                  <ShieldCheck size={12} /> Admin
                </span>
              )}
              {user.is_verified ? (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: 'var(--success)',
                    backgroundColor: 'var(--success-bg)',
                    border: '1px solid var(--success-border)',
                  }}
                >
                  ✓ Vérifié
                </span>
              ) : (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    color: 'var(--warning)',
                    backgroundColor: 'var(--warning-bg)',
                  }}
                >
                  En attente
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div
          className="rounded-2xl transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {[
            { icon: <User2 size={16} />, label: "Nom d'utilisateur", value: user.username },
            { icon: <Mail size={16} />, label: "Email", value: user.email },
            { icon: <Calendar size={16} />, label: "Membre depuis", value: new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { icon: <Key size={16} />, label: "ID Compte", value: `#${user.id}` },
          ].map(({ icon, label, value }, i, arr) => (
            <div
              key={label}
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <span className="shrink-0" style={{ color: 'var(--muted-foreground)' }}>{icon}</span>
              <span className="text-sm w-36 shrink-0" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Preferences */}
        <div
          className="rounded-2xl p-5 space-y-4 transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Préférences</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--foreground)' }}>Mode d'affichage</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {isDark ? 'Mode sombre actif' : 'Mode clair actif'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
              style={{ background: isDark ? 'var(--primary)' : 'var(--muted-foreground)' }}
            >
              <span
                className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300',
                  isDark ? 'translate-x-5' : ''
                )}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button variant="secondary" icon={<Server size={16} />} onClick={() => navigate('/vms')} className="justify-start">
            Mes machines virtuelles
          </Button>
          <Button variant="danger" icon={<LogOut size={16} />} onClick={handleLogout} className="justify-start">
            {t('nav.logout')}
          </Button>
        </div>
      </div>
    </Layout>
  )
}
