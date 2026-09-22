import { useState } from 'react'
import { User2, Mail, ShieldCheck, Calendar, Key, Server, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'

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
        <h1 className="text-2xl font-bold text-dark-100">{t('nav.profile')}</h1>

        {/* Avatar card */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow
            flex items-center justify-center text-white text-3xl font-bold">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-100">{user.username}</h2>
            <p className="text-sm text-dark-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {user.is_admin && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <ShieldCheck size={12} /> Admin
                </span>
              )}
              {user.is_verified ? (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ✓ Vérifié
                </span>
              ) : (
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">En attente</span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl divide-y divide-dark-800">
          {[
            { icon: <User2 size={16} />, label: "Nom d'utilisateur", value: user.username },
            { icon: <Mail size={16} />, label: "Email", value: user.email },
            { icon: <Calendar size={16} />, label: "Membre depuis", value: new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { icon: <Key size={16} />, label: "ID Compte", value: `#${user.id}` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <span className="text-dark-500 shrink-0">{icon}</span>
              <span className="text-sm text-dark-500 w-36 shrink-0">{label}</span>
              <span className="text-sm text-dark-200 font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Preferences */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-dark-200">Préférences</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-200">Mode d'affichage</p>
              <p className="text-xs text-dark-500">{isDark ? 'Mode sombre actif' : 'Mode clair actif'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
              style={{ background: isDark ? '#3b82f6' : '#475569' }}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${isDark ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button variant="ghost" icon={<Server size={16} />} onClick={() => navigate('/vms')} className="justify-start">
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
