import { clsx } from 'clsx'

// Sparkline data – static decorative lines per card
const SPARKLINES = {
  blue:  [30, 40, 35, 50, 45, 60, 55, 70],
  green: [20, 30, 25, 35, 30, 45, 40, 55],
  gray:  [50, 45, 55, 40, 50, 38, 45, 42],
  red:   [10, 15, 12, 20, 18, 25, 22, 28],
  amber: [25, 30, 28, 35, 32, 40, 38, 45],
}

const COLORS = {
  blue:  { iconBg: 'bg-blue-50',    iconText: 'text-blue-500',    border: 'border-blue-100',    line: '#3B82F6', fill: 'rgba(59,130,246,0.08)'   },
  green: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-500', border: 'border-emerald-100', line: '#10B981', fill: 'rgba(16,185,129,0.08)'   },
  gray:  { iconBg: 'bg-slate-50',   iconText: 'text-slate-500',   border: 'border-slate-100',   line: '#94A3B8', fill: 'rgba(148,163,184,0.08)'  },
  red:   { iconBg: 'bg-red-50',     iconText: 'text-red-500',     border: 'border-red-100',     line: '#EF4444', fill: 'rgba(239,68,68,0.08)'    },
  amber: { iconBg: 'bg-amber-50',   iconText: 'text-amber-500',   border: 'border-amber-100',   line: '#F59E0B', fill: 'rgba(245,158,11,0.08)'   },
}

function MiniSparkline({ color, data }) {
  const c = COLORS[color] || COLORS.blue
  const W = 80, H = 32
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const polygon = `0,${H} ${polyline} ${W},${H}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polygon points={polygon} fill={c.fill} />
      <polyline points={polyline} fill="none" stroke={c.line} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StatCard({ icon, label, value, color = 'blue', trend = '• 0%' }) {
  const c = COLORS[color] || COLORS.blue
  const data = SPARKLINES[color] || SPARKLINES.blue
  return (
    <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(10,37,64,0.04)] hover:shadow-[0_8px_25px_-4px_rgba(10,37,64,0.07)] transition-all duration-200 flex flex-col justify-between min-h-[130px] relative overflow-hidden">

      {/* Icon badge */}
      <div className="flex items-center justify-between mb-2">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', c.iconBg, c.iconText, c.border)}>
          {icon}
        </div>
      </div>

      {/* Value + Label */}
      <div className="flex-1">
        <p className="text-2xl sm:text-[28px] font-black text-[#0F172A] tracking-tight leading-none font-sans">
          {value}
        </p>
        <p className="text-xs sm:text-[13px] font-medium text-slate-500 mt-1 leading-tight">{label}</p>
      </div>

      {/* Trend + Sparkline row */}
      <div className="flex items-end justify-between mt-3">
        <span className="text-[11px] font-semibold text-slate-400">{trend}</span>
        <MiniSparkline color={color} data={data} />
      </div>
    </div>
  )
}

