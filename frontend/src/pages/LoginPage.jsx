import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ArrowRight, Globe, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

// Available languages matching the reference dropdown (FR, EN, AR)
const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
]

// Exact SVG Vector Logo for Holcim matching the reference image perfectly
function HolcimVectorLogo({ className = 'h-12' }) {
  return (
    <div className={`flex items-center justify-center gap-4 select-none ${className}`}>
      {/* Holcim Infinity Ribbon Emblem (Green to Blue gradient ribbon) */}
      <svg
        viewBox="0 0 110 90"
        className="h-11 w-auto shrink-0 drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Blue Loop Gradient */}
          <linearGradient id="holcimBlueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0072CE" />
            <stop offset="100%" stopColor="#005A9C" />
          </linearGradient>
          {/* Green Loop Gradient */}
          <linearGradient id="holcimGreenGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78BE20" />
            <stop offset="100%" stopColor="#A3D638" />
          </linearGradient>
        </defs>

        {/* Left Green Rounded Loop segment */}
        <path
          d="M38 78 C22 78 10 66 10 50 C10 34 22 22 38 22 C44 22 50 25 54 29 L54 44 C50 38 44 34 38 34 C28 34 22 40 22 50 C22 60 28 66 38 66 C48 66 54 60 54 54 L54 69 C50 75 44 78 38 78 Z"
          fill="url(#holcimGreenGrad)"
        />

        {/* Right Blue Rounded Loop segment */}
        <path
          d="M72 12 C88 12 100 24 100 40 C100 56 88 68 72 68 C66 68 60 65 56 61 L56 46 C60 52 66 56 72 56 C82 56 88 50 88 40 C88 30 82 24 72 24 C62 24 56 30 56 36 L56 21 C60 15 66 12 72 12 Z"
          fill="url(#holcimBlueGrad)"
        />

        {/* Center link / bridge */}
        <path
          d="M48 38 L62 52"
          stroke="#0072CE"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
      </svg>

      {/* Bold Dark Navy Wordmark "HOLCIM" */}
      <span className="text-[34px] font-black tracking-[-0.03em] text-[#0A2540] font-sans">
        HOLCIM
      </span>
    </div>
  )
}

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Form State
  const [form, setForm] = useState({
    username: localStorage.getItem('remember_username') || 'admin',
    password: '',
  })
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem('remember_me') !== 'false'
  )
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Language Dropdown State
  const [showLangMenu, setShowLangMenu] = useState(false)
  const langRef = useRef(null)

  const currentLang = (i18n.language || 'fr').slice(0, 2).toUpperCase()

  // Click outside to close language menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('lang', langCode)
    setShowLangMenu(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(form.username.trim(), form.password)
      if (rememberMe) {
        localStorage.setItem('remember_username', form.username.trim())
        localStorage.setItem('remember_me', 'true')
      } else {
        localStorage.removeItem('remember_username')
        localStorage.setItem('remember_me', 'false')
      }
      toast.success(`Bienvenue, ${user.username} !`)
      navigate(user.is_admin ? '/admin' : '/dashboard')
    } catch (err) {
      let msg = err?.response?.data?.detail
      if (!err?.response) {
        msg = "Impossible de contacter le serveur backend. Veuillez vérifier qu'il est bien démarré."
      } else if (msg === 'Incorrect username or password' || !msg) {
        msg = t('auth.wrongCredentials') || 'Identifiants incorrects'
      }
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F0F6FC] font-sans antialiased overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: Factory Photograph with Modern Teal/Blue Overlay
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 lg:w-[50.7%] min-h-[340px] md:min-h-screen overflow-hidden flex items-end">
        {/* Background Image: extracted exactly from the reference */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/holcim_factory_reference.jpg')",
          }}
        />

        {/* Elegant geometric teal/cyan angled overlay at bottom-left like in reference */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
          style={{
            background:
              'linear-gradient(135deg, rgba(0, 114, 206, 0.45) 0%, rgba(120, 190, 32, 0.25) 50%, transparent 80%)',
          }}
        />

        {/* Subtle dark vignette on edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: Clean Minimalist White/Blue Canvas with Card
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 lg:w-[49.3%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-gradient-to-b from-[#F7FAFD] to-[#EDF4FB]">
        {/* Soft decorative background teal-blue wave blob (like reference) */}
        <div
          className="absolute -left-20 bottom-0 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(167, 243, 208, 0.35) 0%, rgba(191, 219, 254, 0.2) 50%, transparent 75%)',
            filter: 'blur(45px)',
          }}
        />

        {/* Top Right Language Switcher (FR v) */}
        <div className="w-full flex justify-end relative z-20">
          <div ref={langRef} className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold shadow-sm border border-slate-200/80 transition-all focus:outline-none focus:ring-2 focus:ring-[#0072CE]/20"
              aria-label="Changer de langue"
            >
              <Globe size={14} className="text-slate-500" />
              <span>{currentLang}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-2 w-32 rounded-xl bg-white shadow-lg border border-slate-200/80 overflow-hidden z-50 animate-slide-down">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      currentLang === lang.label ? 'text-[#0072CE] font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[11px] text-slate-400">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Centered Content: Logo + Login Card */}
        <div className="w-full max-w-[440px] mx-auto my-auto relative z-10 flex flex-col items-center">
          {/* Large Centered Holcim Logo above the form */}
          <div className="mb-10 text-center">
            <HolcimVectorLogo />
          </div>

          {/* White Login Card matching the reference exactly */}
          <div className="w-full bg-white rounded-[24px] p-8 sm:p-10 shadow-[0_12px_40px_-8px_rgba(10,37,64,0.08),0_2px_10px_-2px_rgba(10,37,64,0.04)] border border-slate-100 transition-all">
            {/* Title: Connexion */}
            <h1 className="text-[22px] font-bold text-[#0F172A] mb-7 tracking-tight">
              Connexion
            </h1>

            {/* Error banner if any */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-fade-in"
              >
                <span className="w-4 h-4 rounded-full bg-red-200 text-red-800 flex items-center justify-center font-bold text-[10px]">
                  !
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Username Input with User Icon */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={18} strokeWidth={1.8} />
                </div>
                <input
                  type="text"
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="admin"
                  className="w-full pl-11 pr-4 py-3.5 bg-[#EDF3FC] hover:bg-[#E6EEF9] focus:bg-[#EAF1FB] text-slate-800 placeholder-slate-400 text-sm rounded-xl border border-transparent focus:border-[#0072CE]/30 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/15 transition-all font-medium"
                />
              </div>

              {/* Password Input with Lock Icon & Toggle Eye */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} strokeWidth={1.8} />
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3.5 bg-[#EDF3FC] hover:bg-[#E6EEF9] focus:bg-[#EAF1FB] text-slate-800 placeholder-slate-400 text-sm rounded-xl border border-transparent focus:border-[#0072CE]/30 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/15 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPwd ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>

              {/* Remember Me Checkbox & Forgot Password Link */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0072CE] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0072CE]"
                  />
                  <span className="font-medium text-[13px]">Se souvenir de moi</span>
                </label>

                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault()
                    toast.info("Veuillez contacter l'administrateur DSI Holcim pour réinitialiser vos accès.")
                  }}
                  className="font-semibold text-[#0066CC] hover:text-[#004C99] hover:underline transition-colors text-[12.5px]"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Main Submit Button: Gradient Blue to Emerald Green */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !form.username || !form.password}
                  className="w-full py-3.5 px-6 rounded-xl text-white font-semibold text-[15px] shadow-[0_4px_16px_rgba(0,114,206,0.25)] hover:shadow-[0_6px_22px_rgba(0,114,206,0.35)] bg-gradient-to-r from-[#0066FF] via-[#0099DD] to-[#00C677] hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2.5 focus:outline-none focus:ring-4 focus:ring-[#0072CE]/20 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <ArrowRight size={17} strokeWidth={2.2} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Subtle Link to register if needed */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#0066CC] hover:underline"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Empty bottom spacer for perfect balance */}
        <div className="w-full h-4" />
      </div>
    </div>
  )
}
