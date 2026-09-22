import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, Cpu, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      navigate(user.is_admin ? '/admin' : '/dashboard')
    } catch (err) {
      const msg = err?.response?.data?.detail || t('auth.wrongCredentials')
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 rounded-full blur-2xl" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
            bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow mb-4">
            <Cpu size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100">Zorin VM Cloud</h1>
          <p className="text-dark-400 text-sm mt-1">VM Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('auth.login')}</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                {t('auth.username')}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  id="login-username"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  placeholder="votre_username"
                  className="input-base pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  id="login-password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="input-base pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={!form.username || !form.password}
              className="w-full mt-2"
              size="lg"
              icon={<Zap size={16} />}
            >
              {t('auth.loginButton')}
            </Button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-dark-500 mt-4">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            {t('auth.registerButton')}
          </Link>
        </p>
      </div>
    </div>
  )
}
