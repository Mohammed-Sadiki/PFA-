import { clsx } from 'clsx'

const statusConfig = {
  running: {
    label: 'Running',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    pulse: true,
  },
  stopped: {
    label: 'Stopped',
    dotClass: 'bg-slate-400',
    badgeClass: 'bg-slate-50 text-slate-500 border-slate-200/60',
    pulse: false,
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-600 border-red-200/60',
    pulse: false,
  },
  creating: {
    label: 'Creating',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-200/60',
    pulse: true,
  },
  pending: {
    label: 'Pending',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200/60',
    pulse: true,
  },
  deleted: {
    label: 'Deleted',
    dotClass: 'bg-slate-300',
    badgeClass: 'bg-slate-50 text-slate-400 border-slate-200/60',
    pulse: false,
  },
}

export default function StatusBadge({ status, className }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.stopped
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        cfg.badgeClass,
        className
      )}
    >
      <span
        className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass, cfg.pulse && 'animate-pulse')}
      />
      {cfg.label}
    </span>
  )
}
