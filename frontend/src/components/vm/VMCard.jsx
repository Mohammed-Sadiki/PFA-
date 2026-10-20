import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Copy, Check, Terminal, Server, Monitor, AppWindow, Cpu, HardDrive, Network
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../ui/StatusBadge'
import { clsx } from 'clsx'

const OS_ICONS = {
  zorin:    <Monitor size={18} strokeWidth={1.8} className="text-slate-600" />,
  ubuntu:   <Server size={18} strokeWidth={1.8} className="text-slate-600" />,
  windows11:<AppWindow size={18} strokeWidth={1.8} className="text-slate-600" />,
}

export default function VMCard({ vm, onRefresh }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const copySSH = (e) => {
    e.stopPropagation()
    if (!vm.ssh_port) return
    const cmd = `ssh -p ${vm.ssh_port} <user>@127.0.0.1`
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const osName = vm.os_type === 'zorin' ? 'Zorin' : vm.os_type === 'ubuntu' ? 'Ubuntu' : 'Windows 11'

  return (
    <div
      onClick={() => navigate(`/vms/${vm.id}`)}
      className={clsx(
        'bg-white rounded-[22px] p-5 sm:p-6 border border-slate-100 transition-all duration-200 cursor-pointer',
        'shadow-[0_4px_20px_-4px_rgba(10,37,64,0.04)] hover:shadow-[0_10px_30px_-4px_rgba(10,37,64,0.08)] hover:-translate-y-0.5',
        'flex flex-col justify-between'
      )}
    >
      {/* Header: OS Icon + VM Name + OS Subtitle + Status Pill */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            {OS_ICONS[vm.os_type] || <Server size={18} strokeWidth={1.8} className="text-slate-600" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-bold text-[#0F172A] truncate tracking-tight">
              {vm.name}
            </h3>
            <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">{osName}</p>
          </div>
        </div>
        <StatusBadge status={vm.status} />
      </div>

      {/* Metrics Row: vCPU, RAM, Disk, IP with Soft Gray Pills */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {/* vCPU */}
        <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center flex flex-col items-center justify-center border border-slate-100/60">
          <Cpu size={14} className="text-slate-400 mb-1" />
          <span className="text-xs font-bold text-[#0F172A] leading-tight">{vm.vcpu} vCPU</span>
        </div>

        {/* RAM */}
        <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center flex flex-col items-center justify-center border border-slate-100/60">
          <span className="text-[11px] font-bold text-slate-400 mb-1">RAM</span>
          <span className="text-xs font-bold text-[#0F172A] leading-tight">{vm.ram_mb} MB</span>
        </div>

        {/* Disk */}
        <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center flex flex-col items-center justify-center border border-slate-100/60">
          <HardDrive size={14} className="text-slate-400 mb-1" />
          <span className="text-xs font-bold text-[#0F172A] leading-tight">{vm.disk_gb || 30} GB</span>
          <span className="text-[9px] text-slate-400">Disk</span>
        </div>

        {/* IP Address */}
        <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center flex flex-col items-center justify-center border border-slate-100/60">
          <Network size={14} className="text-slate-400 mb-1" />
          <span className="text-[11px] font-bold text-[#0F172A] leading-tight truncate max-w-full">
            {vm.ip_address || '10.0.2.15'}
          </span>
          <span className="text-[9px] text-slate-400">IP</span>
        </div>
      </div>

      {/* SSH Box */}
      <div
        onClick={copySSH}
        title="Cliquer pour copier la commande SSH"
        className="flex items-center justify-between gap-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 transition-colors mb-4 group"
      >
        <div className="flex items-center gap-2 truncate font-mono text-[11px] text-slate-500">
          <span className="text-slate-400 font-bold">&gt;_</span>
          <span className="truncate">ssh -p {vm.ssh_port || 22} &lt;user&gt;@127.0.0.1</span>
        </div>
        <button
          type="button"
          className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Date row */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
        <Calendar size={13} className="text-slate-400" />
        <span>{new Date(vm.created_at || Date.now()).toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  )
}
