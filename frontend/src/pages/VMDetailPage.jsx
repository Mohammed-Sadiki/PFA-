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
import { useTheme } from '../contexts/ThemeContext'

export default function VMDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { isDark } = useTheme()

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

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const tickColor = isDark ? '#94a3b8' : '#64748b' // slate-400 / slate-500
  const tooltipBg = isDark ? '#1e293b' : '#ffffff' // slate-800 / white
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0' // slate-700 / slate-200
  const tooltipColor = isDark ? '#f8fafc' : '#0f172a' // slate-50 / slate-900

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Back + header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/vms')}
              className="p-2 rounded-xl transition-all"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono" style={{ color: 'var(--foreground)' }}>{vm.name}</h1>
                <StatusBadge status={vm.status} />
              </div>
              <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--muted-foreground)' }}>{vm.os_type} · ID #{vm.id}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost"
              icon={<RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />}
              onClick={() => fetchVM(true)} disabled={!!actionLoading}>
              {t('common.refresh')}
            </Button>
            {(vm.status || '').toLowerCase() === 'stopped' && (
              <Button size="sm" variant="success" icon={<Play size={14} />}
                onClick={handleStart} loading={actionLoading === 'start'} disabled={!!actionLoading}>
                {t('vm.start')}
              </Button>
            )}
            {(vm.status || '').toLowerCase() === 'running' && (
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
        {(vm.status || '').toLowerCase() === 'error' && vm.error_message && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl animate-fade-in"
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)'
            }}
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Erreur de provisioning</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--danger)' }}>{vm.error_message}</p>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}><Cpu size={14} /> vCPU</div>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{vm.vcpu}</p>
            {vm.cpu_usage_percent > 0 && <p className="text-xs" style={{ color: 'var(--primary)' }}>{vm.cpu_usage_percent.toFixed(1)}% utilisé</p>}
          </div>
          <div
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}><MemoryStick size={14} /> RAM</div>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{vm.ram_mb} <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>MB</span></p>
            {vm.ram_usage_mb > 0 && <p className="text-xs" style={{ color: 'var(--success)' }}>{vm.ram_usage_mb.toFixed(0)} MB utilisé</p>}
          </div>
          <div
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}><HardDrive size={14} /> Disque</div>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{vm.disk_gb} <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>GB</span></p>
          </div>
          <div
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}><Clock size={14} /> Uptime</div>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{uptime(vm.uptime_seconds)}</p>
          </div>
        </div>

        {/* Connection info + Metrics chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Network / SSH */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <Network size={16} style={{ color: 'var(--primary)' }} /> Réseau & Connexion
            </h3>
            <div className="space-y-3">
              {vm.ip_address && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Adresse IP</span>
                  <code className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>{vm.ip_address}</code>
                </div>
              )}
              {vm.ssh_port && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Port SSH</span>
                  <code className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>{vm.ssh_port}</code>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Créé le</span>
                <span className="text-xs" style={{ color: 'var(--foreground)' }}>{new Date(vm.created_at).toLocaleString()}</span>
              </div>
              {vm.started_at && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Démarré le</span>
                  <span className="text-xs" style={{ color: 'var(--foreground)' }}>{new Date(vm.started_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {vm.ssh_port && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mt-2" style={{ backgroundColor: 'var(--muted)' }}>
                <Terminal size={13} className="shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                <code className="text-xs font-mono truncate flex-1" style={{ color: 'var(--muted-foreground)' }}>
                  ssh -p {vm.ssh_port} &lt;user&gt;@127.0.0.1
                </code>
                <button
                  onClick={copySSH}
                  className="transition-colors shrink-0"
                  style={{ color: copied ? 'var(--success)' : 'var(--muted-foreground)' }}
                  onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--primary)' }}
                  onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--muted-foreground)' }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </div>

          {/* Resource chart */}
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--foreground)' }}>
              <Activity size={16} style={{ color: 'var(--primary)' }} /> Métriques en temps réel
            </h3>
            {metricsHistory.length < 2 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--muted-foreground)' }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', fontSize: '12px', color: tooltipColor }}
                    labelStyle={{ color: tickColor }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
                  <Area type="monotone" dataKey="ram" stroke="#10b981" fill="url(#ramGrad)" strokeWidth={2} name="RAM MB" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Logs section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} /> {t('vm.logs')}
            </h3>
            <Button size="sm" variant="ghost"
              icon={<FileText size={14} />}
              onClick={fetchLogs} loading={loadingLogs}>
              Charger les logs
            </Button>
          </div>
          {showLogs && (
            <pre
              className="p-4 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--sidebar-bg)', // using darker bg if dark mode, light if light mode
                color: 'var(--foreground)'
              }}
            >
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
