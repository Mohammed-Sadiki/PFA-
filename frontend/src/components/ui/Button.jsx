import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-500 text-white shadow-glow-sm hover:shadow-glow border border-primary-500/30',
  secondary: 'bg-dark-800 hover:bg-dark-700 text-dark-100 border border-dark-600 hover:border-dark-500',
  ghost: 'bg-transparent hover:bg-white/5 text-dark-300 hover:text-dark-100 border border-transparent hover:border-white/10',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40',
  success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40',
  warning: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40',
  outline: 'bg-transparent hover:bg-primary-500/10 text-primary-400 border border-primary-500/40 hover:border-primary-500/70',
}

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1',
  sm: 'px-3 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2',
  xl: 'px-6 py-3.5 text-base rounded-xl gap-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-200 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/40',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
        'active:scale-95',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'xs' || size === 'sm' ? 14 : 16} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}
