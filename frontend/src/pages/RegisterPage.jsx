import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, Globe, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { register } from '../api/auth'
import { useToast } from '../hooks/useToast'

// Available languages matching the reference dropdown (FR, EN, AR)
const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
]

// Exact SVG Vector Logo for Holcim matching the reference image
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
          <linearGradient id="holcimRegBlueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0072CE" />
            <stop offset="100%" stopColor="#005A9C" />
          </linearGradient>
          <linearGradient id="holcimRegGreenGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78BE20" />
            <stop offset="100%" stopColor="#A3D638" />
          </linearGradient>
        </defs>

        {/* Left Green Rounded Loop segment */}
        <path
          d="M38 78 C22 78 10 66 10 50 C10 34 22 22 38 22 C44 22 50 25 54 29 L54 44 C50 38 44 34 38 34 C28 34 22 40 22 50 C22 60 28 66 38 66 C48 66 54 60 54 54 L54 69 C50 75 44 78 38 78 Z"
          fill="url(#holcimRegGreenGrad)"
        />

        {/* Right Blue Rounded Loop segment */}
        <path
          d="M72 12 C88 12 100 24 100 40 C100 56 88 68 72 68 C66 68 60 65 56 61 L56 46 C60 52 66 56 72 56 C82 56 88 50 88 40 C88 30 82 24 72 24 C62 24 56 30 56 36 L56 21 C60 15 66 12 72 12 Z"
          fill="url(#holcimRegBlueGrad)"
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

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()

  // Form State
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Language Dropdown State
  const [showLangMenu, setShowLangMenu] = useState(false)
  const langRef = useRef(null)
  const currentLang = (i18n.language || 'fr').slice(0, 2).toUpperCase()

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

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    if (form.username.length < 3) return "Le nom d'utilisateur doit faire au moins 3 caractères."
    if (form.password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.'
    if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      setSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.detail || t('common.error')
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      toast.error(typeof msg === 'string' ? msg : 'Erreur lors de l’inscription.')
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
        {/* Background Image from Holcim reference */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/holcim_factory_reference.jpg')",
          }}
        />

        {/* Elegant geometric teal/cyan angled overlay at bottom-left */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
          style={{
            background:
              'linear-gradient(135deg, rgba(0, 114, 206, 0.45) 0%, rgba(120, 190, 32, 0.25) 50%, transparent 80%)',
          }}
        />

        {/* Subtle dark vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: Clean Minimalist White/Blue Canvas with Card
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 lg:w-[49.3%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-gradient-to-b from-[#F7FAFD] to-[#EDF4FB] overflow-y-auto">
        {/* Soft decorative background teal-blue wave blob */}
        <div
          className="absolute -left-20 bottom-0 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(167, 243, 208, 0.35) 0%, rgba(191, 219, 254, 0.2) 50%, transparent 75%)',
            filter: 'blur(45px)',
          }}
        />

        {/* Top Right Language Switcher */}
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

        {/* Centered Content: Logo + Registration Card */}
        <div className="w-full max-w-[440px] mx-auto my-auto relative z-10 flex flex-col items-center py-6">
          {/* Large Centered Holcim Logo above the form */}
          <div className="mb-8 text-center">
            <HolcimVectorLogo />
          </div>

          {/* White Card matching Holcim design language */}
          <div className="w-full bg-white rounded-[24px] p-8 sm:p-10 shadow-[0_12px_40px_-8px_rgba(10,37,64,0.08),0_2px_10px_-2px_rgba(10,37,64,0.04)] border border-slate-100 transition-all">
            {success ? (
              <div className="text-center py-4 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mb-5">
                  <CheckCircle size={36} />
                </div>
                <h2 className="text-xl font-bold text-[#0F172A] mb-2">Compte créé avec succès !</h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  {t('auth.pendingApproval') || 'Votre compte a été enregistré. Un administrateur DSI doit valider votre accès avant votre première connexion.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-6 rounded-xl text-white font-semibold text-sm shadow-[0_4px_16px_rgba(0,114,206,0.25)] bg-gradient-to-r from-[#0066FF] via-[#0099DD] to-[#00C677] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Retour à la connexion</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <>
                {/* Title: Inscription */}
                <h1 className="text-[22px] font-bold text-[#0F172A] mb-6 tracking-tight">
                  Inscription
                </h1>

                {/* Error Banner */}
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

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Username */}
                  <div className="space-y-1">
                    <label
                      htmlFor="reg-username"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {t('auth.username') || "Nom d'utilisateur"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <User size={18} strokeWidth={1.8} />
                      </div>
                      <input
                        type="text"
                        id="reg-username"
                        autoComplete="username"
                        required
                        value={form.username}
                        onChange={set('username')}
                        placeholder="mon_username"
                        className="w-full pl-11 pr-4 py-3 bg-[#EDF3FC] hover:bg-[#E6EEF9] focus:bg-[#EAF1FB] text-slate-800 placeholder-slate-400 text-sm rounded-xl border border-transparent focus:border-[#0072CE]/30 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/15 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label
                      htmlFor="reg-email"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {t('auth.email') || 'Adresse email'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} strokeWidth={1.8} />
                      </div>
                      <input
                        type="email"
                        id="reg-email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={set('email')}
                        placeholder="email@example.com"
                        className="w-full pl-11 pr-4 py-3 bg-[#EDF3FC] hover:bg-[#E6EEF9] focus:bg-[#EAF1FB] text-slate-800 placeholder-slate-400 text-sm rounded-xl border border-transparent focus:border-[#0072CE]/30 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/15 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label
                      htmlFor="reg-password"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {t('auth.password') || 'Mot de passe'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock size={18} strokeWidth={1.8} />
                      </div>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        id="reg-password"
                        autoComplete="new-password"
                        required
                        value={form.password}
                        onChange={set('password')}
                        placeholder="Min. 8 caractères"
                        className="w-full pl-11 pr-11 py-3 bg-[#EDF3FC] hover:bg-[#E6EEF9] focus:bg-[#EAF1FB] text-slate-800 placeholder-slate-400 text-sm rounded-xl border border-transparent focus:border-[#0072CE]/30 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/15 transition-all font-medium"
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
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label
                      htmlFor="reg-confirm-password"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {t('auth.confirmPassword') || 'Confirmer le mot de passe'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock size={18} strokeWidth={1.8} />
                      </div>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        id="reg-confirm-password"
                        autoComplete="new-password"
                        required
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        placeholder="Répétez le mot de passe"
                        className="w-full pl-11 pr-4 py-3 bg-[#EDF3FC] hover:bg-[#E6EEF9] focus:bg-[#EAF1FB] text-slate-800 placeholder-slate-400 text-sm rounded-xl border border-transparent focus:border-[#0072CE]/30 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/15 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Submit Button: Blue to Green Gradient */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !form.username || !form.email || !form.password}
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
                          <span>Création en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Créer un compte</span>
                          <ArrowRight size={17} strokeWidth={2.2} />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Back to Login */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    {t('auth.hasAccount') || 'Déjà un compte ?'}{' '}
                    <Link
                      to="/login"
                      className="font-semibold text-[#0066CC] hover:text-[#004C99] hover:underline"
                    >
                      {t('auth.login') || 'Connexion'}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Empty bottom spacer for perfect balance */}
        <div className="w-full h-4" />
      </div>
    </div>
  )
}
