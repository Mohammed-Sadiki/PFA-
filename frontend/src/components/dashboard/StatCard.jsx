import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ icon, label, value, subtitle, trend, color = 'blue', loading = false }) {
  const colors = {
    blue:   { bg: 'from-primary-500/15 to-primary-600/5', icon: 'bg-primary-500/20 text-primary-400', border: 'border-primary-500/20' },
    green:  { bg: 'from-emerald-500/15 to-emerald-600/5', icon: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/20' },
    red:    { bg: 'from-red-500/15 to-red-600/5',         icon: 'bg-red-500/20 text-red-400',         border: 'border-red-500/20' },
    amber:  { bg: 'from-amber-500/15 to-amber-600/5',     icon: 'bg-amber-500/20 text-amber-400',     border: 'border-amber-500/20' },
    violet: { bg: 'from-violet-500/15 to-violet-600/5',   icon: 'bg-violet-500/20 text-violet-400',   border: 'border-violet-500/20' },
    gray:   { bg: 'from-dark-700/50 to-dark-800/20',      icon: 'bg-dark-700 text-dark-400',          border: 'border-dark-700/50' },
  }
  const c = colors[color] || colors.blue

  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl p-5',
      'bg-gradient-to-br', c.bg,
      'border', c.border,
      'transition-all duration-200 hover:scale-[1.02] hover:shadow-card-lg cursor-default',
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-2.5 rounded-xl', c.icon)}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend > 0 ? 'text-emerald-400 bg-emerald-500/10' :
            trend < 0 ? 'text-red-400 bg-red-500/10' :
            'text-dark-400 bg-dark-700/50'
          )}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trend !== 0 && `${Math.abs(trend)}%`}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-8 w-20 rounded" />
          <div className="skeleton h-4 w-28 rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-dark-100 leading-tight">{value}</p>
          <p className="text-sm text-dark-400 mt-1">{label}</p>
          {subtitle && <p className="text-xs text-dark-500 mt-0.5">{subtitle}</p>}
        </>
      )}

      {/* Decorative circle */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, currentColor, transparent)` }} />
    </div>
  )
}
