import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, Trash2, CheckCheck, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../api/notifications'
import Layout from '../components/layout/Layout'
import Button from '../components/ui/Button'
import { useToast } from '../hooks/useToast'
import { clsx } from 'clsx'

const TYPE_COLORS = {
  success: 'border-l-emerald-500 bg-emerald-500/5',
  error: 'border-l-red-500 bg-red-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-blue-500 bg-blue-500/5',
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

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
              <Bell size={24} className="text-primary-400" />
              {t('notifications.title')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-dark-400 mt-1">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
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
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === f
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-dark-400 hover:text-dark-200 border border-transparent'
              )}
            >
              {f === 'all' ? `Toutes (${notifications.length})` : `Non lues (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell size={40} className="text-dark-700 mb-3" />
            <p className="text-dark-400">{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  'flex items-start gap-3 p-4 rounded-2xl border border-l-4 border-dark-700 transition-all',
                  TYPE_COLORS[n.type] || TYPE_COLORS.info,
                  !n.is_read && 'ring-1 ring-primary-500/20'
                )}
              >
                <span className="text-xl shrink-0 mt-0.5">{n.title.split(' ')[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-200">
                    {n.title.replace(/^[^\s]+\s/, '')}
                  </p>
                  <p className="text-sm text-dark-400 mt-0.5 whitespace-pre-wrap">{n.message}</p>
                  <p className="text-xs text-dark-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1.5 rounded-lg text-dark-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                      title="Marquer comme lu"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
