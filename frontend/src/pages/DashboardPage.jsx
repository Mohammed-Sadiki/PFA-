import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, PlusCircle, Activity, Bell, RefreshCw, Layers,
  Play, Square, MoreHorizontal, Clock, Settings, Plus
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { listVMs, startVM, stopVM } from '../api/vms'
import { getNotifications } from '../api/notifications'
import Layout from '../components/layout/Layout'
import StatCard from '../components/dashboard/StatCard'
import { SkeletonStatCard } from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'

/* ────────── OS icon helpers ────────── */
const OS_BADGE = {
  ubuntu:    { bg: 'bg-orange-500', label: 'U' },
  zorin:     { bg: 'bg-blue-500',   label: 'Z' },
  windows11: { bg: 'bg-sky-600',    label: 'W' },
}
function OsIcon({ osType }) {
  const os = OS_BADGE[osType] || { bg: 'bg-slate-400', label: 'V' }
  return (
    <div className={`w-8 h-8 rounded-full ${os.bg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
      {os.label}
    </div>
  )
}

function osLabel(osType) {
  if (osType === 'ubuntu')    return 'Ubuntu 22.04'
  if (osType === 'zorin')     return 'Zorin OS 17'
  if (osType === 'windows11') return 'Windows 11'
  return osType || 'Inconnu'
}

/* ────────── Activity dot colors ────────── */
const ACTIV_COLOR = {
  start:   'bg-emerald-500',
  stop:    'bg-red-500',
  create:  'bg-blue-500',
  config:  'bg-amber-500',
  default: 'bg-slate-400',
}
function activityColor(title = '') {
  const t = title.toLowerCase()
  if (t.includes('démarr') || t.includes('start'))  return ACTIV_COLOR.start
  if (t.includes('arrêt') || t.includes('stop'))     return ACTIV_COLOR.stop
  if (t.includes('crée') || t.includes('créat'))     return ACTIV_COLOR.create
  if (t.includes('config') || t.includes('modif'))   return ACTIV_COLOR.config
  return ACTIV_COLOR.default
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'À l\'instant'
  if (m < 60)  return `Il y a ${m} minute${m > 1 ? 's' : ''}`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Il y a ${h} heure${h > 1 ? 's' : ''}`
  const d = Math.floor(h / 24)
  return `Il y a ${d} jour${d > 1 ? 's' : ''}`
}

/* ────────── Greeting ────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

/* ────────── Date card (top-right of banner) ────────── */
function DateCard() {
  const now = new Date()
  const day  = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const date = now.getDate()
  const month = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return (
    <div className="hidden sm:flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-lg text-center min-w-[110px]">
      <p className="text-xs font-semibold text-slate-500 capitalize">{day}</p>
      <p className="text-4xl font-black text-[#1D4ED8] leading-none my-1">{date}</p>
      <p className="text-[11px] font-medium text-slate-500 capitalize">{month}</p>
    </div>
  )
}

/* ────────── VM Row (list format) ────────── */
function VMRow({ vm, onRefresh }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleStart = async (e) => {
    e.stopPropagation()
    setLoading(true)
    try { await startVM(vm.id); onRefresh() } catch {} finally { setLoading(false) }
  }
  const handleStop = async (e) => {
    e.stopPropagation()
    setLoading(true)
    try { await stopVM(vm.id); onRefresh() } catch {} finally { setLoading(false) }
  }

  const STATUS_STYLE = {
    running: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    stopped: 'bg-red-50   text-red-500     border border-red-200',
    error:   'bg-red-50   text-red-600     border border-red-200',
    creating:'bg-amber-50 text-amber-600   border border-amber-200',
    pending: 'bg-blue-50  text-blue-600    border border-blue-200',
  }
  const statusStyle = STATUS_STYLE[vm.status] || STATUS_STYLE.stopped
  const statusLabel = {
    running:'En cours', stopped:'Arrêtée', error:'Erreur', creating:'Création', pending:'En attente'
  }[vm.status] || vm.status

  const createdAt = vm.created_at
    ? new Date(vm.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) +
      '\n' + new Date(vm.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
    : '—'

  const vcpu = vm.vcpu || 4
  const ram  = vm.ram_mb ? `${(vm.ram_mb / 1024).toFixed(0)} GB` : '4 GB'

  return (
    <div
      onClick={() => navigate(`/vms/${vm.id}`)}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-100 last:border-b-0"
    >
      {/* OS icon */}
      <OsIcon osType={vm.os_type} />

      {/* Name + OS */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#1D4ED8] truncate">{vm.name}</p>
        <p className="text-xs text-slate-400 font-medium">{osLabel(vm.os_type)}</p>
      </div>

      {/* Status badge */}
      <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyle}`}>
        {statusLabel}
      </span>

      {/* vCPU */}
      <span className="hidden md:block text-xs font-semibold text-slate-600 w-14 text-center">{vcpu} vCPU</span>

      {/* RAM */}
      <span className="hidden md:block text-xs font-semibold text-slate-600 w-14 text-center">{ram}</span>

      {/* Date */}
      <div className="hidden lg:block text-center text-[11px] text-slate-400 font-medium w-20 whitespace-pre-line">
        {createdAt}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleStart}
          disabled={loading || vm.status === 'running'}
          title="Démarrer"
          className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <Play size={12} className="fill-emerald-600 ml-0.5" />
        </button>
        <button
          onClick={handleStop}
          disabled={loading || vm.status !== 'running'}
          title="Arrêter"
          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <Square size={11} className="fill-red-500" />
        </button>
        <button
          onClick={() => navigate(`/vms/${vm.id}`)}
          title="Plus"
          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  )
}

/* ────────── Activity item ────────── */
function ActivityItem({ notif }) {
  const dot = activityColor(notif.title)
  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-b-0">
      <div className={`w-2.5 h-2.5 rounded-full ${dot} mt-1 shrink-0`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#0F172A] truncate">{notif.title || 'Activité'}</p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{notif.message}</p>
      </div>
      <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
        {relativeTime(notif.created_at)}
      </span>
    </div>
  )
}

/* ─────────────────────── Page ─────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [vms, setVMs]                   = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [vmsData, notifsData] = await Promise.all([listVMs(), getNotifications(10)])
      setVMs(vmsData)
      setNotifications(notifsData)
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => {
    fetchAll()
    const handler = (e) => {
      const { event } = e.detail
      if (['VM_STATUS_UPDATED','VM_DELETED','VM_CREATED','VM_PROVISION_FINISHED'].includes(event)) fetchAll(true)
    }
    window.addEventListener('ws:message', handler)
    return () => window.removeEventListener('ws:message', handler)
  }, [fetchAll])

  const stats = {
    total:   vms.length,
    running: vms.filter(v => v.status === 'running').length,
    stopped: vms.filter(v => v.status === 'stopped').length,
    error:   vms.filter(v => v.status === 'error').length,
  }

  const recentVMs = [...vms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const unreadCount = notifications.filter(n => !n.is_read).length

  /* KPI icons – rounded filled shapes like screenshot */
  const kpiIcons = {
    total:   <div className="w-5 h-5 rounded-lg bg-blue-500 flex items-center justify-center"><Layers size={11} className="text-white" /></div>,
    running: <Play size={18} className="fill-emerald-500 text-emerald-500" />,
    stopped: <Square size={16} className="fill-red-500 text-red-500" />,
    error:   <span className="text-[18px] leading-none">⚠️</span>,
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

        {/* ── Hero banner ───────────────────────────────────── */}
        <div
          className="relative rounded-[20px] overflow-hidden h-[150px] sm:h-[170px] flex items-end"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 40%, #1D6A5A 80%, #2D7A3A 100%)',
          }}
        >
          {/* Factory overlay image */}
          <div className="absolute inset-0 opacity-25 bg-gradient-to-r from-transparent via-transparent to-transparent" />
          {/* Holcim silos decoration */}
          <div className="absolute right-0 bottom-0 h-full flex items-end opacity-20 select-none pointer-events-none">
            <div className="w-16 h-28 bg-white/30 rounded-t-full mx-1" />
            <div className="w-12 h-24 bg-white/20 rounded-t-full mx-1" />
            <div className="w-10 h-20 bg-white/15 rounded-t-full mx-1" />
          </div>
          {/* Holcim logo watermark */}
          <div className="absolute right-28 top-1/2 -translate-y-1/2 hidden sm:block">
            <div className="flex items-center gap-2 opacity-30">
              <div className="w-10 h-10 rounded-full border-4 border-white/60" />
              <p className="text-white text-xl font-black tracking-wide">HOLCIM</p>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full flex items-end justify-between p-5 sm:p-6">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight flex items-center gap-2">
                {greeting()}, <span className="text-white">{user?.username || 'admin'}</span>
                <span>👋</span>
              </h1>
              <p className="text-sm text-white/70 font-medium mt-1">Vue d'ensemble de votre infrastructure</p>
            </div>
            <DateCard />
          </div>
        </div>

        {/* ── 4 KPI cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1,2,3,4].map(i => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard icon={kpiIcons.total}   label="Total VMs" value={stats.total}   color="blue"  trend={`+0%`} />
              <StatCard icon={kpiIcons.running} label="En cours"  value={stats.running} color="green" trend={`• 0%`} />
              <StatCard icon={kpiIcons.stopped} label="Arrêtées"  value={stats.stopped} color="red"   trend={`• 0%`} />
              <StatCard icon={kpiIcons.error}   label="En erreur" value={stats.error}   color={stats.error > 0 ? 'amber' : 'gray'} trend={`• 0%`} />
            </>
          )}
        </div>

        {/* ── 4 Quick action buttons ────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Créer une VM – blue filled */}
          <button
            onClick={() => navigate('/create')}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[16px] bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-[0_4px_14px_rgba(29,78,216,0.35)] hover:shadow-[0_6px_20px_rgba(29,78,216,0.45)] transition-all active:scale-[0.98] col-span-1"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <PlusCircle size={16} />
              </div>
              <span className="text-sm font-bold">Créer une VM</span>
            </div>
            <span className="text-white/70 text-lg">→</span>
          </button>

          {/* Mes VMs */}
          <button
            onClick={() => navigate('/vms')}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[16px] bg-white border border-slate-200/80 hover:border-[#1D4ED8]/30 hover:bg-blue-50/40 shadow-sm transition-all text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                <Server size={15} />
              </div>
              <span className="text-sm font-bold text-[#0F172A]">Mes VMs</span>
            </div>
            <span className="text-slate-400 text-base">→</span>
          </button>

          {/* Activité */}
          <button
            onClick={() => navigate('/activity')}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[16px] bg-white border border-slate-200/80 hover:border-[#1D4ED8]/30 hover:bg-blue-50/40 shadow-sm transition-all text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity size={15} />
              </div>
              <span className="text-sm font-bold text-[#0F172A]">Activité</span>
            </div>
            <span className="text-slate-400 text-base">→</span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[16px] bg-white border border-slate-200/80 hover:border-[#1D4ED8]/30 hover:bg-blue-50/40 shadow-sm transition-all text-left relative"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center relative">
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
              <span className="text-sm font-bold text-[#0F172A]">Notifications</span>
            </div>
            <span className="text-slate-400 text-base">→</span>
          </button>
        </div>

        {/* ── Bottom: VMs list + Activity ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* VMs récentes – 2 cols wide */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Server size={13} />
                </div>
                <h2 className="text-sm font-bold text-[#0F172A]">VMs récentes</h2>
              </div>
              <button
                onClick={() => navigate('/vms')}
                className="text-xs font-semibold text-slate-400 hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
              >
                Voir tout →
              </button>
            </div>

            <div className="bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(10,37,64,0.04)] overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_80px_70px_70px_80px_100px] gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Nom</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">Statut</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">vCPU</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">RAM</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">Date</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">Actions</span>
              </div>

              {loading ? (
                <div className="py-10 text-center text-xs text-slate-400">Chargement…</div>
              ) : recentVMs.length === 0 ? (
                <div className="py-12 text-center">
                  <Server size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">Aucune machine virtuelle</p>
                  <button onClick={() => navigate('/create')} className="mt-3 text-xs font-bold text-[#1D4ED8] hover:underline">+ Créer une VM</button>
                </div>
              ) : (
                recentVMs.map(vm => (
                  <VMRow key={vm.id} vm={vm} onRefresh={() => fetchAll(true)} />
                ))
              )}
            </div>
          </div>

          {/* Activité récente – 1 col */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Clock size={13} />
                </div>
                <h2 className="text-sm font-bold text-[#0F172A]">Activité récente</h2>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs font-semibold text-slate-400 hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
              >
                Voir tout →
              </button>
            </div>

            <div className="bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(10,37,64,0.04)] overflow-hidden">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">Aucune activité récente.</div>
              ) : (
                notifications.slice(0, 6).map(n => (
                  <ActivityItem key={n.id} notif={n} />
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </Layout>
  )
}




