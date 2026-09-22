import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, Cpu, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { register } from '../api/auth'
import { useToast } from '../hooks/useToast'
import Button from '../components/ui/Button'

export default function RegisterPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    if (form.username.length < 3) return 'Le nom d\'utilisateur doit faire au moins 3 caractères.'
    if (form.password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.'
    if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      setSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.detail || t('common.error')
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl
            bg-emerald-500/15 border border-emerald-500/25 mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-dark-100 mb-2">Compte créé !</h2>
          <p className="text-dark-400 mb-6">
            {t('auth.pendingApproval')}
          </p>
          <Button onClick={() => navigate('/login')} size="lg" className="w-full">
            {t('auth.login')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
            bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow mb-4">
            <Cpu size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100">Créer un compte</h1>
          <p className="text-dark-400 text-sm mt-1">Rejoignez Zorin VM Cloud</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('auth.register')}</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                {t('auth.username')}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text" id="reg-username" autoComplete="username"
                  value={form.username} onChange={set('username')} required
                  placeholder="mon_username" className="input-base pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="email" id="reg-email" autoComplete="email"
                  value={form.email} onChange={set('email')} required
                  placeholder="email@example.com" className="input-base pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type={showPwd ? 'text' : 'password'} id="reg-password" autoComplete="new-password"
                  value={form.password} onChange={set('password')} required
                  placeholder="Min. 8 caractères" className="input-base pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type={showPwd ? 'text' : 'password'} id="reg-confirm-password" autoComplete="new-password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} required
                  placeholder="Répétez le mot de passe" className="input-base pl-10"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              {t('auth.registerButton')}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-dark-500 mt-4">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
