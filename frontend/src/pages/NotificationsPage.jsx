import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, Trash2, CheckCheck, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../api/notifications'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useToast } from '../hooks/useToast'

// Couleur de la bordure gauche selon le type
const TYPE_BORDER = {
  success: 'var(--success)',
  error:   'var(--danger)',
  warning: 'var(--warning)',
  info:    '#3b82f6',
}

const TYPE_BG = {
  success: 'var(--success-bg)',
  error:   'var(--danger-bg)',
  warning: 'var(--warning-bg)',
  info:    'rgba(59,130,246,0.06)',
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | unread

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getNotifications(100)
      setNotifications(data)
    } catch { toast.error(t('common.error')) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleMarkRead = async (id) => {
    await markAsRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleMarkAll = async () => {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toast.success(t('notifications.markAllRead'))
  }

  const handleDelete = async (id) => {
    await deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const activeTabStyle = {
    backgroundColor: 'var(--primary-bg)',
    color: 'var(--primary)',
    border: '1px solid var(--primary-border)',
  }
  const inactiveTabStyle = {
    backgroundColor: 'transparent',
    color: 'var(--muted-foreground)',
    border: '1px solid transparent',
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <Bell size={24} className="text-primary-500" />
              {t('notifications.title')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetch}>
              {t('common.refresh')}
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" icon={<CheckCheck size={14} />} onClick={handleMarkAll}>
                {t('notifications.markAllRead')}
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filter === f ? activeTabStyle : inactiveTabStyle}
              onMouseEnter={e => { if (filter !== f) { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)' } }}
              onMouseLeave={e => { if (filter !== f) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' } }}
            >
              {f === 'all' ? `Toutes (${notifications.length})` : `Non lues (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell size={40} className="mb-3" style={{ color: 'var(--border-strong)' }} />
            <p style={{ color: 'var(--muted-foreground)' }}>{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const borderColor = TYPE_BORDER[n.type] || TYPE_BORDER.info
              const bgColor = TYPE_BG[n.type] || TYPE_BG.info
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-4 rounded-2xl transition-all"
                  style={{
                    backgroundColor: bgColor,
                    border: '1px solid var(--border)',
                    borderLeft: `4px solid ${borderColor}`,
                    outline: !n.is_read ? '1px solid rgba(59,130,246,0.15)' : 'none',
                    outlineOffset: '1px',
                  }}
                >
                  <span className="text-xl shrink-0 mt-0.5">{n.title.split(' ')[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {n.title.replace(/^\S+\s/, '')}
                    </p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--placeholder)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-1.5 rounded-lg transition-all"
                        title="Marquer comme lu"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 rounded-lg transition-all"
                      title="Supprimer"
                      style={{ color: 'var(--muted-foreground)' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
