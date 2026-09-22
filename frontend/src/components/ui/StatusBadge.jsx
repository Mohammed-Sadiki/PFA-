import { clsx } from 'clsx'

const statusConfig = {
  running:  { label: 'Running',  dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', pulse: true },
  stopped:  { label: 'Stopped',  dot: 'bg-dark-500',    bg: 'bg-dark-700/50 border-dark-600/50 text-dark-400', pulse: false },
  error:    { label: 'Error',    dot: 'bg-red-400',     bg: 'bg-red-500/10 border-red-500/25 text-red-400', pulse: false },
  creating: { label: 'Creating', dot: 'bg-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25 text-amber-400', pulse: true },
  pending:  { label: 'Pending',  dot: 'bg-violet-400',  bg: 'bg-violet-500/10 border-violet-500/25 text-violet-400', pulse: true },
  deleted:  { label: 'Deleted',  dot: 'bg-dark-600',    bg: 'bg-dark-800/50 border-dark-600/50 text-dark-500', pulse: false },
}

export default function StatusBadge({ status, className }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.stopped
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
      cfg.bg, className
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full shrink-0',
        cfg.dot,
        cfg.pulse && 'animate-pulse'
      )} />
      {cfg.label}
    </span>
  )
}

// Also export a simple dot indicator
export function StatusDot({ status, size = 2 }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.stopped
  return (
    <span className={clsx(
      `w-${size} h-${size} rounded-full shrink-0`,
      cfg.dot,
      cfg.pulse && 'animate-pulse'
    )} />
  )
}
