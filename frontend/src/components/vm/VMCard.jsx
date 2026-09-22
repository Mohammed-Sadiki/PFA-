import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, Square, Trash2, Terminal, Eye,
  Cpu, MemoryStick, HardDrive, Network, Calendar,
  Copy, Check, RotateCcw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { startVM, stopVM, deleteVM } from '../../api/vms'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'
import { ConfirmModal } from '../ui/Modal'
import { useToast } from '../../hooks/useToast'
import { clsx } from 'clsx'

const OS_ICONS = {
  zorin: '🐧',
  ubuntu: '🐧',
  windows11: '🪟',
}

function MetricChip({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-dark-800/60 rounded-xl px-3 py-2 min-w-0">
      <div className="text-dark-500">{icon}</div>
      <p className="text-xs font-bold text-dark-200">{value}</p>
      <p className="text-[10px] text-dark-500">{label}</p>
    </div>
  )
}

export default function VMCard({ vm, onRefresh }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(null) // 'start' | 'stop' | 'delete'
  const [showDelete, setShowDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const isRunning = vm.status === 'running'
  const isStopped = vm.status === 'stopped'
  const isBusy = ['creating', 'pending'].includes(vm.status)

  const handleStart = async () => {
    setLoading('start')
    try {
      await startVM(vm.id)
      toast.success(t('vm.startSuccess'), vm.name)
      onRefresh?.()
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(null)
    }
  }

  const handleStop = async () => {
    setLoading('stop')
    try {
      await stopVM(vm.id)
      toast.info(t('vm.stopSuccess'), vm.name)
      onRefresh?.()
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    setLoading('delete')
    try {
      await deleteVM(vm.id)
      toast.warning(t('vm.deleteSuccess'), vm.name)
      setShowDelete(false)
      onRefresh?.()
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(null)
    }
  }

  const copySSH = () => {
    if (!vm.ssh_port) return
    const cmd = `ssh -p ${vm.ssh_port} <username>@127.0.0.1`
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const uptimeStr = vm.uptime_seconds
    ? vm.uptime_seconds > 3600
      ? `${Math.floor(vm.uptime_seconds / 3600)}h ${Math.floor((vm.uptime_seconds % 3600) / 60)}m`
      : `${Math.floor(vm.uptime_seconds / 60)}m`
    : '—'

  return (
    <>
      <div className={clsx(
        'bg-dark-900 border rounded-2xl p-5 flex flex-col gap-4',
        'transition-all duration-200 hover:border-dark-600 hover:shadow-card-lg',
        vm.status === 'running' ? 'border-emerald-500/20' :
        vm.status === 'error' ? 'border-red-500/20' :
        'border-dark-700'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-xl shrink-0">
              {OS_ICONS[vm.os_type] || '🖥️'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-dark-100 truncate" title={vm.name}>
                {vm.name}
              </h3>
              <p className="text-xs text-dark-500 capitalize">{vm.os_type}</p>
            </div>
          </div>
          <StatusBadge status={vm.status} />
        </div>

        {/* Metrics row */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <MetricChip
            icon={<Cpu size={12} />}
            label={`${vm.vcpu} vCPU`}
            value={vm.cpu_usage_percent ? `${vm.cpu_usage_percent.toFixed(0)}%` : '—'}
          />
          <MetricChip
            icon={<MemoryStick size={12} />}
            label={`${vm.ram_mb} MB`}
            value={vm.ram_usage_mb ? `${vm.ram_usage_mb.toFixed(0)} MB` : '—'}
          />
          <MetricChip
            icon={<HardDrive size={12} />}
            label="Disk"
            value={`${vm.disk_gb} GB`}
          />
          {vm.ip_address && (
            <MetricChip
              icon={<Network size={12} />}
              label="IP"
              value={vm.ip_address}
            />
          )}
        </div>

        {/* SSH command */}
        {vm.ssh_port && (
          <div className="flex items-center gap-2 bg-dark-800/60 rounded-xl px-3 py-2">
            <Terminal size={13} className="text-dark-500 shrink-0" />
            <code className="text-xs text-dark-300 font-mono truncate flex-1">
              ssh -p {vm.ssh_port} &lt;user&gt;@127.0.0.1
            </code>
            <button
              onClick={copySSH}
              className="text-dark-500 hover:text-primary-400 transition-colors shrink-0"
              title={t('vm.copySSH')}
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <Calendar size={12} />
          <span>{new Date(vm.created_at).toLocaleDateString()}</span>
          {vm.uptime_seconds > 0 && (
            <span className="ml-auto text-emerald-500/70">↑ {uptimeStr}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-dark-800 pt-3">
          {isStopped && (
            <Button
              size="sm"
              variant="success"
              icon={<Play size={14} />}
              onClick={handleStart}
              loading={loading === 'start'}
              disabled={!!loading || isBusy}
            >
              {t('vm.start')}
            </Button>
          )}
          {isRunning && (
            <Button
              size="sm"
              variant="warning"
              icon={<Square size={14} />}
              onClick={handleStop}
              loading={loading === 'stop'}
              disabled={!!loading || isBusy}
            >
              {t('vm.stop')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/vms/${vm.id}`)}
          >
            {t('vm.details')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 size={14} />}
            onClick={() => setShowDelete(true)}
            disabled={!!loading || isBusy}
            className="ml-auto"
          >
            {t('vm.delete')}
          </Button>
        </div>

        {/* Error message */}
        {vm.status === 'error' && vm.error_message && (
          <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
            ⚠️ {vm.error_message}
          </p>
        )}
      </div>

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('vm.confirmDelete')}
        description={t('vm.confirmDeleteDesc')}
        confirmLabel={t('vm.delete')}
        confirmVariant="danger"
        loading={loading === 'delete'}
      />
    </>
  )
}
