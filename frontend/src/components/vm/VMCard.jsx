import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, Square, Trash2, Terminal, Eye,
  Cpu, MemoryStick, HardDrive, Network, Calendar,
  Copy, Check, Monitor, Server, AppWindow
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { startVM, stopVM, deleteVM } from '../../api/vms'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'
import { ConfirmModal } from '../ui/Modal'
import { useToast } from '../../hooks/useToast'
import { clsx } from 'clsx'

const OS_ICONS = {
  zorin:    <Monitor size={20} strokeWidth={2} />,
  ubuntu:   <Server size={20} strokeWidth={2} />,
  windows11:<AppWindow size={20} strokeWidth={2} />,
}

function MetricChip({ icon, label, value }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-0"
      style={{ backgroundColor: 'var(--muted)' }}
    >
      <div style={{ color: 'var(--muted-foreground)' }}>{icon}</div>
      <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
    </div>
  )
}

export default function VMCard({ vm, onRefresh }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const statusStr = (vm.status || '').toLowerCase()
  const isRunning = statusStr === 'running'
  const isStopped = statusStr === 'stopped'
  const isBusy    = ['creating', 'pending'].includes(statusStr)

  const handleStart = async () => {
    setLoading('start')
    try {
      await startVM(vm.id)
      toast.success(t('vm.startSuccess'), vm.name)
      onRefresh?.()
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error'))
    } finally { setLoading(null) }
  }

  const handleStop = async () => {
    setLoading('stop')
    try {
      await stopVM(vm.id)
      toast.info(t('vm.stopSuccess'), vm.name)
      onRefresh?.()
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error'))
    } finally { setLoading(null) }
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
    } finally { setLoading(null) }
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

  // Couleur de la bordure selon le statut
  const borderColor =
    statusStr === 'running' ? 'rgba(16,185,129,0.25)' :
    statusStr === 'error'   ? 'rgba(239,68,68,0.25)'  :
    'var(--border)'

  return (
    <>
      <div
        className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
        style={{
          backgroundColor: 'var(--card)',
          border: `1px solid ${borderColor}`,
          boxShadow: 'var(--shadow-card)',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--card-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--card)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              {OS_ICONS[vm.os_type] || <Monitor size={20} strokeWidth={2} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate" title={vm.name} style={{ color: 'var(--foreground)' }}>
                {vm.name}
              </h3>
              <p className="text-xs capitalize" style={{ color: 'var(--muted-foreground)' }}>{vm.os_type}</p>
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
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <Terminal size={13} className="shrink-0" style={{ color: 'var(--muted-foreground)' }} />
            <code className="text-xs font-mono truncate flex-1" style={{ color: 'var(--muted-foreground)' }}>
              ssh -p {vm.ssh_port} &lt;user&gt;@127.0.0.1
            </code>
            <button
              onClick={copySSH}
              className="shrink-0 transition-colors"
              title={t('vm.copySSH')}
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.color = copied ? '#10b981' : 'var(--muted-foreground)'}
            >
              {copied
                ? <Check size={13} style={{ color: 'var(--success)' }} />
                : <Copy size={13} />
              }
            </button>
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <Calendar size={12} />
          <span>{new Date(vm.created_at).toLocaleDateString()}</span>
          {vm.uptime_seconds > 0 && (
            <span className="ml-auto" style={{ color: 'var(--success)' }}>↑ {uptimeStr}</span>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex flex-wrap gap-2 pt-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {isStopped && (
            <Button
              size="sm" variant="success"
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
              size="sm" variant="warning"
              icon={<Square size={14} />}
              onClick={handleStop}
              loading={loading === 'stop'}
              disabled={!!loading || isBusy}
            >
              {t('vm.stop')}
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/vms/${vm.id}`)}
          >
            {t('vm.details')}
          </Button>
          <Button
            size="sm" variant="danger"
            icon={<Trash2 size={14} />}
            onClick={() => setShowDelete(true)}
            disabled={!!loading || isBusy}
            className="ml-auto"
          >
            {t('vm.delete')}
          </Button>
        </div>

        {/* Error message */}
        {statusStr === 'error' && vm.error_message && (
          <p
            className="text-xs rounded-lg px-3 py-2"
            style={{
              color: 'var(--danger)',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
            }}
          >
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
