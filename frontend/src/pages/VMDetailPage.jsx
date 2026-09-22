import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, Play, Square, RefreshCw, Trash2,
  Cpu, MemoryStick, HardDrive, Network,
  Terminal, FileText, Activity, ArrowLeft,
  Copy, Check, Clock, Calendar, AlertTriangle
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getVM, startVM, stopVM, deleteVM, getVMLogs, getVMMetrics } from '../api/vms'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { ConfirmModal } from '../components/ui/Modal'
import { useToast } from '../hooks/useToast'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line
} from 'recharts'

function MetricGauge({ label, value, max, unit, color = 'blue' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const colors = {
    blue: 'stroke-primary-500',
    green: 'stroke-emerald-500',
    amber: 'stroke-amber-500',
    red: 'stroke-red-500',
  }
  const textColors = {
    blue: 'text-primary-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }
  const c = 60
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2 bg-dark-800/60 rounded-2xl p-4">
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={c / 2 + 2} cy={c / 2 + 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle
          cx={c / 2 + 2} cy={c / 2 + 2} r={r} fill="none"
          strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          className={`${colors[color]} transition-all duration-500`}
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
          className={`text-xs font-bold fill-current ${textColors[color]}`}
          style={{ fontSize: '10px', fill: 'currentColor' }}>
          {pct.toFixed(0)}%
        </text>
      </svg>
      <div className="text-center">
        <p className="text-xs font-semibold text-dark-200">{label}</p>
        <p className="text-[10px] text-dark-500">{value?.toFixed(0)} / {max} {unit}</p>
      </div>
    </div>
  )
}

export default function VMDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const [vm, setVM] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [metricsHistory, setMetricsHistory] = useState([])

  const fetchVM = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await getVM(id)
      setVM(data)
      // Append to metrics history (max 20 points)
      setMetricsHistory((prev) => {
        const point = {
          time: new Date().toLocaleTimeString(),
          cpu: data.cpu_usage_percent ?? 0,
          ram: data.ram_usage_mb ?? 0,
        }
        return [...prev.slice(-19), point]
      })
    } catch {
      navigate('/vms')
      toast.error('VM introuvable')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchVM()
    const interval = setInterval(() => fetchVM(true), 15000)
    const handler = (e) => {
      const { event, data } = e.detail
      if (['VM_STATUS_UPDATED', 'VM_PROVISION_FINISHED'].includes(event) && String(data?.id) === String(id)) {
        fetchVM(true)
      }
    }
    window.addEventListener('ws:message', handler)
    return () => { clearInterval(interval); window.removeEventListener('ws:message', handler) }
  }, [fetchVM, id])

  const handleStart = async () => {
    setActionLoading('start')
    try { await startVM(id); toast.success(t('vm.startSuccess')); fetchVM(true) }
    catch (e) { toast.error(e?.response?.data?.detail || t('common.error')) }
    finally { setActionLoading(null) }
  }

  const handleStop = async () => {
    setActionLoading('stop')
    try { await stopVM(id); toast.info(t('vm.stopSuccess')); fetchVM(true) }
    catch (e) { toast.error(e?.response?.data?.detail || t('common.error')) }
    finally { setActionLoading(null) }
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    try { await deleteVM(id); toast.warning(t('vm.deleteSuccess')); navigate('/vms') }
    catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); setActionLoading(null) }
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try { const d = await getVMLogs(id); setLogs(d.logs || 'Aucun log disponible.') }
    catch { setLogs('Erreur lors du chargement des logs.') }
    finally { setLoadingLogs(false) }
    setShowLogs(true)
  }

  const copySSH = () => {
    if (!vm?.ssh_port) return
    navigator.clipboard.writeText(`ssh -p ${vm.ssh_port} <username>@127.0.0.1`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const uptime = (s) => {
    if (!s) return '—'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
          <div className="skeleton h-8 w-48 rounded-xl" />
          <div className="skeleton h-48 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-32 rounded-2xl" />
          </div>
        </div>
      </Layout>
    )
  }

  if (!vm) return null

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Back + header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/vms')}
              className="p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-dark-100 font-mono">{vm.name}</h1>
                <StatusBadge status={vm.status} />
              </div>
              <p className="text-sm text-dark-500 mt-0.5 capitalize">{vm.os_type} · ID #{vm.id}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost"
              icon={<RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />}
              onClick={() => fetchVM(true)} disabled={!!actionLoading}>
              {t('common.refresh')}
            </Button>
            {vm.status === 'stopped' && (
              <Button size="sm" variant="success" icon={<Play size={14} />}
                onClick={handleStart} loading={actionLoading === 'start'} disabled={!!actionLoading}>
                {t('vm.start')}
              </Button>
            )}
            {vm.status === 'running' && (
              <Button size="sm" variant="warning" icon={<Square size={14} />}
                onClick={handleStop} loading={actionLoading === 'stop'} disabled={!!actionLoading}>
                {t('vm.stop')}
              </Button>
            )}
            <Button size="sm" variant="danger" icon={<Trash2 size={14} />}
              onClick={() => setShowDelete(true)} disabled={!!actionLoading}>
              {t('vm.delete')}
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {vm.status === 'error' && vm.error_message && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Erreur de provisioning</p>
              <p className="text-sm text-red-300/80 mt-0.5">{vm.error_message}</p>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-dark-500 text-xs"><Cpu size={14} /> vCPU</div>
            <p className="text-2xl font-bold text-dark-100">{vm.vcpu}</p>
            {vm.cpu_usage_percent > 0 && <p className="text-xs text-primary-400">{vm.cpu_usage_percent.toFixed(1)}% utilisé</p>}
          </div>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-dark-500 text-xs"><MemoryStick size={14} /> RAM</div>
            <p className="text-2xl font-bold text-dark-100">{vm.ram_mb} <span className="text-sm text-dark-500">MB</span></p>
            {vm.ram_usage_mb > 0 && <p className="text-xs text-emerald-400">{vm.ram_usage_mb.toFixed(0)} MB utilisé</p>}
          </div>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-dark-500 text-xs"><HardDrive size={14} /> Disque</div>
            <p className="text-2xl font-bold text-dark-100">{vm.disk_gb} <span className="text-sm text-dark-500">GB</span></p>
          </div>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-dark-500 text-xs"><Clock size={14} /> Uptime</div>
            <p className="text-2xl font-bold text-dark-100">{uptime(vm.uptime_seconds)}</p>
          </div>
        </div>

        {/* Connection info + Metrics chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Network / SSH */}
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
              <Network size={16} className="text-primary-400" /> Réseau & Connexion
            </h3>
            <div className="space-y-3">
              {vm.ip_address && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-500">Adresse IP</span>
                  <code className="text-xs font-mono text-dark-200 bg-dark-800 px-2 py-1 rounded">{vm.ip_address}</code>
                </div>
              )}
              {vm.ssh_port && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-500">Port SSH</span>
                  <code className="text-xs font-mono text-dark-200 bg-dark-800 px-2 py-1 rounded">{vm.ssh_port}</code>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-dark-500">Créé le</span>
                <span className="text-xs text-dark-300">{new Date(vm.created_at).toLocaleString()}</span>
              </div>
              {vm.started_at && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-500">Démarré le</span>
                  <span className="text-xs text-dark-300">{new Date(vm.started_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {vm.ssh_port && (
              <div className="flex items-center gap-2 bg-dark-800/60 rounded-xl px-3 py-2 mt-2">
                <Terminal size={13} className="text-dark-500 shrink-0" />
                <code className="text-xs text-dark-300 font-mono truncate flex-1">
                  ssh -p {vm.ssh_port} &lt;user&gt;@127.0.0.1
                </code>
                <button onClick={copySSH}
                  className="text-dark-500 hover:text-primary-400 transition-colors shrink-0">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </div>

          {/* Resource chart */}
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2 mb-4">
              <Activity size={16} className="text-primary-400" /> Métriques en temps réel
            </h3>
            {metricsHistory.length < 2 ? (
              <div className="flex items-center justify-center h-32 text-dark-600 text-sm">
                En attente de données...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={metricsHistory} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
                  <Area type="monotone" dataKey="ram" stroke="#10b981" fill="url(#ramGrad)" strokeWidth={2} name="RAM MB" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Logs section */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
            <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
              <FileText size={16} className="text-primary-400" /> {t('vm.logs')}
            </h3>
            <Button size="sm" variant="ghost"
              icon={<FileText size={14} />}
              onClick={fetchLogs} loading={loadingLogs}>
              Charger les logs
            </Button>
          </div>
          {showLogs && (
            <pre className="p-4 text-xs font-mono text-dark-300 bg-dark-950 overflow-auto max-h-64 whitespace-pre-wrap">
              {logs || 'Aucun log disponible.'}
            </pre>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('vm.confirmDelete')}
        description={t('vm.confirmDeleteDesc')}
        confirmLabel={t('vm.delete')}
        confirmVariant="danger"
        loading={actionLoading === 'delete'}
      />
    </Layout>
  )
}
