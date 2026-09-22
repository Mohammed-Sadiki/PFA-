import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, PlusCircle, TrendingUp,
  Activity, ArrowRight, RefreshCw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { listVMs } from '../api/vms'
import { getNotifications } from '../api/notifications'
import Layout from '../components/layout/Layout'
import StatCard from '../components/dashboard/StatCard'
import VMCard from '../components/vm/VMCard'
import Button from '../components/ui/Button'
import { SkeletonStatCard, SkeletonCard } from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'

function NotifItem({ notif }) {
  const typeColors = {
    success: { color: 'var(--success)', bg: 'var(--success-bg)' },
    error:   { color: 'var(--danger)',  bg: 'var(--danger-bg)' },
    warning: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
    info:    { color: '#3b82f6',        bg: 'rgba(59,130,246,0.08)' },
  }
  const tc = typeColors[notif.type] || typeColors.info

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl transition-all"
      style={{ backgroundColor: !notif.is_read ? 'rgba(59,130,246,0.04)' : 'transparent' }}
    >
      <span className="text-base shrink-0 mt-0.5">{notif.title.split(' ')[0]}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
          {notif.title.replace(/^\S+\s/, '')}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{notif.message}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--placeholder)' }}>
          {new Date(notif.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [vms, setVMs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [vmsData, notifsData] = await Promise.all([listVMs(), getNotifications(10)])
      setVMs(vmsData)
      setNotifications(notifsData)
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const handler = (e) => {
      const { event } = e.detail
      if (['VM_STATUS_UPDATED', 'VM_DELETED', 'VM_CREATED', 'VM_PROVISION_FINISHED'].includes(event)) {
        fetchAll(true)
      }
    }
    window.addEventListener('ws:message', handler)
    return () => window.removeEventListener('ws:message', handler)
  }, [fetchAll])

  const stats = {
    total:   vms.length,
    running: vms.filter((v) => v.status === 'running').length,
    stopped: vms.filter((v) => v.status === 'stopped').length,
    error:   vms.filter((v) => v.status === 'error').length,
  }

  const recentVMs = [...vms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const quickActions = [
    { label: 'Créer une VM',  icon: <PlusCircle size={20} />, to: '/create',        accent: 'var(--primary)' },
    { label: 'Mes VMs',       icon: <Server size={20} />,     to: '/vms',           accent: '#3b82f6' },
    { label: 'Notifications', icon: <Activity size={20} />,   to: '/notifications', accent: '#8b5cf6' },
  ]

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              {greeting()},{' '}
              <span className="gradient-text">{user?.username}</span> 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {t('dashboard.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm"
              icon={<RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => fetchAll(true)}
              disabled={refreshing}
            >
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              icon={<PlusCircle size={15} />}
              onClick={() => navigate('/create')}
            >
              {t('dashboard.createVM')}
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard icon={<Server size={20} />}      label={t('dashboard.totalVMs')}   value={stats.total}   color="blue" />
              <StatCard icon={<Activity size={20} />}    label={t('dashboard.runningVMs')} value={stats.running} color="green" />
              <StatCard icon={<Server size={20} />}      label={t('dashboard.stoppedVMs')} value={stats.stopped} color="gray" />
              <StatCard icon={<TrendingUp size={20} />}  label={t('dashboard.errorVMs')}   value={stats.error}   color={stats.error > 0 ? 'red' : 'gray'} />
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 p-4 rounded-2xl text-left group transition-all duration-200"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--card-hover)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--card)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div
                className="p-2.5 rounded-xl transition-all"
                style={{ backgroundColor: `${item.accent}18`, color: item.accent }}
              >
                {item.icon}
              </div>
              <span className="text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
                {item.label}
              </span>
              <ArrowRight
                size={16}
                className="ml-auto transition-all group-hover:translate-x-1"
                style={{ color: 'var(--muted-foreground)' }}
              />
            </button>
          ))}
        </div>

        {/* Bottom grid: Recent VMs + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent VMs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                {t('dashboard.recentVMs')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/vms')}>
                {t('dashboard.viewAll')} →
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : recentVMs.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-2xl text-center"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <Server size={32} className="mb-3" style={{ color: 'var(--border-strong)' }} />
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('dashboard.noVMs')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--placeholder)' }}>{t('dashboard.noVMsDesc')}</p>
                <Button size="sm" className="mt-4" icon={<PlusCircle size={14} />} onClick={() => navigate('/create')}>
                  {t('dashboard.createVM')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentVMs.map((vm) => (
                  <VMCard key={vm.id} vm={vm} onRefresh={() => fetchAll(true)} />
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                {t('dashboard.recentActivity')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
                {t('dashboard.viewAll')} →
              </Button>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {t('notifications.empty')}
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.slice(0, 6).map((n, i) => (
                    <div
                      key={n.id}
                      style={i < notifications.slice(0, 6).length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}
                    >
                      <NotifItem notif={n} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
