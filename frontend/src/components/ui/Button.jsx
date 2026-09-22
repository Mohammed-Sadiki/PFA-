import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-primary-600 hover:bg-primary-500 text-white shadow-glow-sm hover:shadow-glow border border-primary-500/30',
  secondary: 'border text-sm font-medium transition-all',
  ghost:     'border border-transparent transition-all',
  danger:    'border transition-all',
  success:   'border transition-all',
  warning:   'border transition-all',
  outline:   'bg-transparent hover:bg-primary-500/10 text-primary-500 dark:text-primary-400 border border-primary-500/40 hover:border-primary-500/70',
}

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1',
  sm: 'px-3 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2',
  xl: 'px-6 py-3.5 text-base rounded-xl gap-2.5',
}

// Style inline pour les variants qui dépendent du thème
function getVariantStyle(variant) {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: 'var(--muted)',
        borderColor: 'var(--border-strong)',
        color: 'var(--foreground)',
      }
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: 'var(--muted-foreground)',
      }
    case 'danger':
      return {
        backgroundColor: 'var(--danger-bg)',
        borderColor: 'var(--danger-border)',
        color: 'var(--danger)',
      }
    case 'success':
      return {
        backgroundColor: 'var(--success-bg)',
        borderColor: 'var(--success-border)',
        color: 'var(--success)',
      }
    case 'warning':
      return {
        backgroundColor: 'var(--warning-bg)',
        borderColor: 'var(--warning-border)',
        color: 'var(--warning)',
      }
    default:
      return {}
  }
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
  style: customStyle,
  ...props
}) {
  const inlineStyle = variant !== 'primary' && variant !== 'outline'
    ? getVariantStyle(variant)
    : {}

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{ ...inlineStyle, ...customStyle }}
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
