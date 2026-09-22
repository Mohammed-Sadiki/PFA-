import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, PlusCircle, TrendingUp,
  Activity, Users, Cpu, MemoryStick, RefreshCw, ArrowRight
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
import { clsx } from 'clsx'

function NotifItem({ notif }) {
  const colors = {
    success: 'text-emerald-400 bg-emerald-500/10',
    error: 'text-red-400 bg-red-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10',
  }
  return (
    <div className={clsx('flex items-start gap-3 p-3 rounded-xl', !notif.is_read && 'bg-primary-500/5')}>
      <span className={clsx('text-base shrink-0 mt-0.5')}>{notif.title.split(' ')[0]}</span>
      <div className="min-w-0">
        <p className="text-sm text-dark-200 font-medium truncate">{notif.title.replace(/^[^\s]+\s/, '')}</p>
        <p className="text-xs text-dark-500 truncate">{notif.message}</p>
        <p className="text-[10px] text-dark-600 mt-0.5">{new Date(notif.created_at).toLocaleString()}</p>
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
    total: vms.length,
    running: vms.filter((v) => v.status === 'running').length,
    stopped: vms.filter((v) => v.status === 'stopped').length,
    error: vms.filter((v) => v.status === 'error').length,
  }

  const recentVMs = [...vms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">
              {greeting()}, <span className="gradient-text">{user?.username}</span> 👋
            </h1>
            <p className="text-dark-400 text-sm mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm"
              icon={<RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => fetchAll(true)} disabled={refreshing}
            >
              {t('common.refresh')}
            </Button>
            <Button size="sm" icon={<PlusCircle size={15} />} onClick={() => navigate('/create')}>
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
              <StatCard
                icon={<Server size={20} />}
                label={t('dashboard.totalVMs')}
                value={stats.total}
                color="blue"
              />
              <StatCard
                icon={<Activity size={20} />}
                label={t('dashboard.runningVMs')}
                value={stats.running}
                color="green"
              />
              <StatCard
                icon={<Server size={20} />}
                label={t('dashboard.stoppedVMs')}
                value={stats.stopped}
                color="gray"
              />
              <StatCard
                icon={<TrendingUp size={20} />}
                label={t('dashboard.errorVMs')}
                value={stats.error}
                color={stats.error > 0 ? 'red' : 'gray'}
              />
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Créer une VM', icon: <PlusCircle size={20} />, to: '/create', color: 'primary' },
            { label: 'Mes VMs', icon: <Server size={20} />, to: '/vms', color: 'blue' },
            { label: 'Notifications', icon: <Activity size={20} />, to: '/notifications', color: 'violet' },
          ].map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 p-4 bg-dark-900 border border-dark-700 rounded-2xl
                hover:border-primary-500/30 hover:bg-dark-800/80 transition-all text-left group"
            >
              <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-all">
                {item.icon}
              </div>
              <span className="text-sm font-medium text-dark-200 group-hover:text-dark-100 transition-colors">
                {item.label}
              </span>
              <ArrowRight size={16} className="ml-auto text-dark-600 group-hover:text-primary-400 transition-all group-hover:translate-x-1" />
            </button>
          ))}
        </div>

        {/* Bottom grid: Recent VMs + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent VMs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-dark-200">{t('dashboard.recentVMs')}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/vms')}>
                {t('dashboard.viewAll')} →
              </Button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : recentVMs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-dark-900 border border-dark-700 rounded-2xl text-center">
                <Server size={32} className="text-dark-700 mb-3" />
                <p className="text-dark-400 text-sm">{t('dashboard.noVMs')}</p>
                <p className="text-dark-600 text-xs mt-1">{t('dashboard.noVMsDesc')}</p>
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
              <h2 className="text-base font-semibold text-dark-200">{t('dashboard.recentActivity')}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
                {t('dashboard.viewAll')} →
              </Button>
            </div>
            <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-dark-500">{t('notifications.empty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-dark-800">
                  {notifications.slice(0, 6).map((n) => (
                    <NotifItem key={n.id} notif={n} />
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
