import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Couleurs de chaque type de card — utilise des couleurs qui marchent dans les 2 thèmes
const colors = {
  blue:   {
    icon: { backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    border: 'rgba(59,130,246,0.2)',
    gradient: 'rgba(59,130,246,0.06)',
  },
  green:  {
    icon: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' },
    border: 'rgba(16,185,129,0.2)',
    gradient: 'rgba(16,185,129,0.06)',
  },
  red:    {
    icon: { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    border: 'rgba(239,68,68,0.2)',
    gradient: 'rgba(239,68,68,0.06)',
  },
  amber:  {
    icon: { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    border: 'rgba(245,158,11,0.2)',
    gradient: 'rgba(245,158,11,0.06)',
  },
  violet: {
    icon: { backgroundColor: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
    border: 'rgba(139,92,246,0.2)',
    gradient: 'rgba(139,92,246,0.06)',
  },
  gray:   {
    icon: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
    border: 'var(--border-strong)',
    gradient: 'transparent',
  },
}

export default function StatCard({ icon, label, value, subtitle, trend, color = 'blue', loading = false }) {
  const c = colors[color] || colors.blue

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] cursor-default"
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid ${c.border}`,
        boxShadow: 'var(--shadow-card)',
        backgroundImage: `radial-gradient(ellipse at top right, ${c.gradient}, transparent 70%)`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={c.icon}>
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={
              trend > 0
                ? { color: 'var(--success)', backgroundColor: 'var(--success-bg)' }
                : trend < 0
                ? { color: 'var(--danger)', backgroundColor: 'var(--danger-bg)' }
                : { color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)' }
            }
          >
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
          <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>{value}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--placeholder)' }}>{subtitle}</p>}
        </>
      )}
    </div>
  )
}
