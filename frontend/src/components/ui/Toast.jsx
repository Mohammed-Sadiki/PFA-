import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useToastEmitter } from '../../hooks/useToast'

const icons = {
  success: <CheckCircle size={18} className="text-emerald-400 shrink-0" />,
  error:   <XCircle size={18} className="text-red-400 shrink-0" />,
  warning: <AlertCircle size={18} className="text-amber-400 shrink-0" />,
  info:    <Info size={18} className="text-blue-400 shrink-0" />,
}

const styles = {
  success: 'border-emerald-500/30 bg-dark-900',
  error:   'border-red-500/30 bg-dark-900',
  warning: 'border-amber-500/30 bg-dark-900',
  info:    'border-blue-500/30 bg-dark-900',
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
    <div className={clsx(
      'flex items-start gap-3 p-4 rounded-xl border shadow-lg',
      'w-80 max-w-full',
      'transition-all duration-300',
      visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
      styles[toast.type] || styles.info
    )}>
      {icons[toast.type] || icons.info}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-dark-100 mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm text-dark-300">{toast.message}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
        className="p-0.5 text-dark-500 hover:text-dark-200 transition-colors shrink-0"
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
