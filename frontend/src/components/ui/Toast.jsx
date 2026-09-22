import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useToastEmitter } from '../../hooks/useToast'

const icons = {
  success: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
  error:   <XCircle    size={18} className="text-red-500 shrink-0" />,
  warning: <AlertCircle size={18} className="text-amber-500 shrink-0" />,
  info:    <Info       size={18} className="text-blue-500 shrink-0" />,
}

// Couleurs de la bordure gauche (indicateur de type)
const borderColors = {
  success: '#10b981',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl',
        'w-80 max-w-full',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
      )}
      style={{
        backgroundColor: 'var(--modal)',
        border: `1px solid var(--border-strong)`,
        borderLeft: `3px solid ${borderColors[toast.type] || borderColors.info}`,
        boxShadow: 'var(--shadow-popup)',
      }}
    >
      {icons[toast.type] || icons.info}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--foreground)' }}>{toast.title}</p>
        )}
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{toast.message}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
        className="p-0.5 rounded transition-colors shrink-0"
        style={{ color: 'var(--muted-foreground)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])
  const { subscribe } = useToastEmitter()

  useEffect(() => {
    const unsub = subscribe((toast) => {
      setToasts((prev) => [...prev, toast])
    })
    return unsub
  }, [subscribe])

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  )
}
