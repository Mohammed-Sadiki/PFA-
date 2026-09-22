import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusCircle, Cpu, MemoryStick, HardDrive,
  Lock, Monitor, ChevronRight, CheckCircle,
  ArrowLeft, Zap, Server
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createVM } from '../api/vms'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useToast } from '../hooks/useToast'
import { clsx } from 'clsx'

const OS_OPTIONS = [
  { value: 'zorin', label: 'Zorin OS Lite', icon: '🐧', desc: 'Léger, rapide et élégant' },
  { value: 'ubuntu', label: 'Ubuntu Server', icon: '🐧', desc: 'Serveur Linux populaire' },
  { value: 'windows11', label: 'Windows 11', icon: '🪟', desc: 'Bureau Windows moderne' },
]

function RangeField({ label, value, min, max, step = 1, onChange, unit, icon }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
          {icon} {label}
        </label>
        <span className="text-sm font-bold text-primary-400 font-mono">{value} {unit}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary-500"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${pct}%, rgba(255,255,255,0.08) ${pct}%)`
          }}
        />
        <div className="flex justify-between text-[10px] text-dark-600 mt-1">
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
    </div>
  )
}

export default function CreateVMPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({
    os_type: 'zorin',
    vcpu: 1,
    ram_mb: 1024,
    disk_gb: 15,
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1 = config, 2 = summary

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const setRaw = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.password || form.password.length < 8) return 'Le mot de passe VM doit faire au moins 8 caractères.'
    if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas.'
    return null
  }

  const handleNext = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setStep(2)
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      await createVM({
        os_type: form.os_type,
        vcpu: form.vcpu,
        ram_mb: form.ram_mb,
        disk_gb: form.disk_gb,
        password: form.password,
      })
      toast.success(t('create.success'))
      navigate('/vms')
    } catch (err) {
      const msg = err?.response?.data?.detail
      const errorMsg = typeof msg === 'string' ? msg :
        Array.isArray(msg) ? msg.map((e) => e.msg).join(', ') :
        t('create.error')
      setError(errorMsg)
      toast.error(errorMsg)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const selectedOS = OS_OPTIONS.find((o) => o.value === form.os_type)

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => step === 2 ? setStep(1) : navigate('/vms')}
            className="p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{t('create.title')}</h1>
            <p className="text-dark-400 text-sm mt-0.5">{t('create.subtitle')}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                step >= s
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-500 border border-dark-700'
              )}>
                {step > s ? <CheckCircle size={16} /> : s}
              </div>
              <span className={clsx('text-sm', step >= s ? 'text-dark-200' : 'text-dark-500')}>
                {s === 1 ? t('create.step1') : t('create.step3')}
              </span>
              {s < 2 && <ChevronRight size={16} className="text-dark-700 mx-1" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Step 1 — Configuration */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* OS Selection */}
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
                {t('create.osType')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {OS_OPTIONS.map((os) => (
                  <button
                    key={os.value}
                    onClick={() => set('os_type')(os.value)}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all',
                      form.os_type === os.value
                        ? 'bg-primary-500/10 border-primary-500/40 text-primary-400'
                        : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-500 hover:bg-dark-800'
                    )}
                  >
                    <span className="text-3xl">{os.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{os.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{os.desc}</p>
                    </div>
                    {form.os_type === os.value && (
                      <span className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <CheckCircle size={12} className="text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-6">
              <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
                <Server size={16} className="text-primary-400" /> Ressources
              </h3>
              <RangeField
                label={t('create.vcpu')} value={form.vcpu}
                min={1} max={4} step={1} unit="vCPU"
                onChange={set('vcpu')}
                icon={<Cpu size={12} />}
              />
              <RangeField
                label={t('create.ramMb')} value={form.ram_mb}
                min={512} max={4096} step={512} unit="MB"
                onChange={set('ram_mb')}
                icon={<MemoryStick size={12} />}
              />
              <RangeField
                label={t('create.diskGb')} value={form.disk_gb}
                min={10} max={50} step={5} unit="GB"
                onChange={set('disk_gb')}
                icon={<HardDrive size={12} />}
              />
            </div>

            {/* VM Password */}
            <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
                <Lock size={16} className="text-primary-400" /> Accès SSH
              </h3>
              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  {t('create.vmPassword')}
                </label>
                <input
                  type="password" id="vm-password" autoComplete="new-password"
                  value={form.password} onChange={setRaw('password')}
                  placeholder="Min. 8 caractères"
                  className="input-base"
                />
                <p className="text-xs text-dark-500 mt-1">{t('create.vmPasswordDesc')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  {t('auth.confirmPassword')}
                </label>
                <input
                  type="password" id="vm-confirm-password" autoComplete="new-password"
                  value={form.confirmPassword} onChange={setRaw('confirmPassword')}
                  placeholder="Répétez le mot de passe"
                  className="input-base"
                />
              </div>
            </div>

            <Button onClick={handleNext} size="lg" className="w-full" icon={<ChevronRight size={16} />}>
              {t('create.next')} — Résumé
            </Button>
          </div>
        )}

        {/* Step 2 — Summary */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-dark-100">{t('create.summary')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'OS', value: selectedOS?.label, icon: selectedOS?.icon },
                  { label: 'vCPU', value: `${form.vcpu} vCPU`, icon: '⚡' },
                  { label: 'RAM', value: `${form.ram_mb} MB`, icon: '💾' },
                  { label: 'Disque', value: `${form.disk_gb} GB`, icon: '💿' },
                  { label: 'SSH', value: 'Port auto-assigné', icon: '🔐' },
                  { label: 'Réseau', value: 'NAT (VirtualBox)', icon: '🌐' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-center gap-3 bg-dark-800/60 rounded-xl px-3 py-3">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-semibold text-dark-200">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 p-3 bg-primary-500/5 border border-primary-500/15 rounded-xl text-xs text-dark-400">
                💡 La VM sera créée en arrière-plan. Vous recevrez une notification quand elle sera prête (~30 secondes).
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" size="lg" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft size={16} /> {t('create.back')}
              </Button>
              <Button
                size="lg"
                onClick={handleCreate}
                loading={loading}
                className="flex-1"
                icon={<Zap size={16} />}
              >
                {loading ? t('create.creating') : t('create.createButton')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
