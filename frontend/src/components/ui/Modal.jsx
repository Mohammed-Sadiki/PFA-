import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import Button from './Button'

export default function Modal({ isOpen, onClose, title, children, size = 'md', className }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className={clsx(
        'relative w-full animate-slide-up',
        'bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl',
        sizes[size],
        className
      )}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-dark-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-700 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={clsx(!title && 'pt-6')}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Confirmation modal shortcut
export function ConfirmModal({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Confirm', confirmVariant = 'danger', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6 pt-4">
        {description && (
          <p className="text-sm text-dark-400 mb-6">{description}</p>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
