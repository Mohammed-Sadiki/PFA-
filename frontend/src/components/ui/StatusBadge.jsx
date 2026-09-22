import { clsx } from 'clsx'

// Statuses utilisent des couleurs sémantiques qui fonctionnent dans les deux thèmes
const statusConfig = {
  running:  {
    label: 'Running',
    dotClass: 'bg-emerald-500',
    style: { backgroundColor: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success)' },
    pulse: true,
  },
  stopped:  {
    label: 'Stopped',
    dotClass: '',
    style: { backgroundColor: 'var(--muted)', borderColor: 'var(--border-strong)', color: 'var(--muted-foreground)' },
    dotStyle: { backgroundColor: 'var(--muted-foreground)', opacity: 0.5 },
    pulse: false,
  },
  error:    {
    label: 'Error',
    dotClass: 'bg-red-500',
    style: { backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger)' },
    pulse: false,
  },
  creating: {
    label: 'Creating',
    dotClass: 'bg-amber-500',
    style: { backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning)' },
    pulse: true,
  },
  pending:  {
    label: 'Pending',
    dotClass: 'bg-violet-500',
    style: { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.25)', color: '#8b5cf6' },
    pulse: true,
  },
  deleted:  {
    label: 'Deleted',
    dotClass: '',
    style: { backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--muted-foreground)' },
    dotStyle: { backgroundColor: 'var(--muted-foreground)', opacity: 0.3 },
    pulse: false,
  },
}

export default function StatusBadge({ status, className }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.stopped
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', className)}
      style={cfg.style}
    >
      <span
        className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass, cfg.pulse && 'animate-pulse')}
        style={cfg.dotStyle || {}}
      />
      {cfg.label}
    </span>
  )
}

// Dot indicator simple
export function StatusDot({ status, size = 2 }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.stopped
  return (
    <span
      className={clsx(`w-${size} h-${size} rounded-full shrink-0`, cfg.dotClass, cfg.pulse && 'animate-pulse')}
      style={cfg.dotStyle || {}}
    />
  )
}
