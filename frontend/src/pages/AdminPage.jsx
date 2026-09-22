import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Users, Server, FileText, UserCheck, UserX,
  Crown, Trash2, RefreshCw, ChevronDown, Search, Eye
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getAdminStats, getAllVMs, getAllUsers, getPendingUsers,
  approveUser, rejectUser, updateUserRole, deleteUser as apiDeleteUser,
  getAuditLogs
} from '../api/admin'
import Layout from '../components/layout/Layout'
import StatCard from '../components/dashboard/StatCard'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { ConfirmModal } from '../components/ui/Modal'
import { SkeletonStatCard } from '../components/ui/Skeleton'
import { useToast } from '../hooks/useToast'
import { clsx } from 'clsx'

const TABS = ['stats', 'users', 'vms', 'audit']

export default function AdminPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState('stats')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [vms, setVMs] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, u, p, v] = await Promise.all([
        getAdminStats(), getAllUsers(), getPendingUsers(), getAllVMs()
      ])
      setStats(s); setUsers(u); setPendingUsers(p); setVMs(v)
    } catch { toast.error(t('common.error')) }
    finally { setLoading(false) }
  }, [])

  const fetchAudit = useCallback(async () => {
    try {
      const d = await getAuditLogs({ limit: 50 })
      setAuditLogs(d.items); setAuditTotal(d.total)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (tab === 'audit') fetchAudit() }, [tab, fetchAudit])
  useEffect(() => {
    const h = (e) => {
      const ev = e.detail.event
      if (['USER_APPROVED','USER_REJECTED','VM_STATUS_UPDATED','VM_DELETED','VM_CREATED','USER_REGISTERED','USER_ROLE_UPDATED'].includes(ev)) {
        fetchData()
      }
    }
    window.addEventListener('ws:message', h)
    return () => window.removeEventListener('ws:message', h)
  }, [fetchData])

  const doAction = async (action, userId) => {
    setActionLoading(userId)
    try {
      if (action === 'approve') await approveUser(userId)
      else if (action === 'reject') await rejectUser(userId)
      else if (action === 'role') await updateUserRole(userId)
      else if (action === 'delete') await apiDeleteUser(userId)
      toast.success('Action effectuée')
      fetchData()
    } catch (e) {
      toast.error(e?.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading(null)
      setConfirmAction(null)
    }
  }

  const filteredUsers = users.filter((u) => !search ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()))

  const filteredVMs = vms.filter((v) => !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.owner_username?.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
              <ShieldCheck size={24} className="text-primary-400" />
              {t('admin.title')}
            </h1>
            {pendingUsers.length > 0 && (
              <p className="text-sm text-amber-400 mt-1">
                ⚠️ {pendingUsers.length} compte{pendingUsers.length > 1 ? 's' : ''} en attente d'approbation
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={15} />} onClick={fetchData}>
            {t('common.refresh')}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-900 border border-dark-700 rounded-xl p-1">
          {TABS.map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className={clsx(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t_
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-dark-400 hover:text-dark-200'
              )}
            >
              {t_ === 'stats' ? '📊 Stats' :
               t_ === 'users' ? `👥 Utilisateurs${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}` :
               t_ === 'vms' ? '🖥 VMs' : '📋 Audit'}
            </button>
          ))}
        </div>

        {/* Search */}
        {(tab === 'users' || tab === 'vms') && (
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="input-base pl-9" />
          </div>
        )}

        {/* Tab: Stats */}
        {tab === 'stats' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? [1,2,3,4].map((i) => <SkeletonStatCard key={i} />) : stats && (
              <>
                <StatCard icon={<Server size={20} />} label="Total VMs" value={stats.total_vms} color="blue" />
                <StatCard icon={<Server size={20} />} label="En cours" value={stats.running_vms} color="green" />
                <StatCard icon={<Server size={20} />} label="Arrêtées" value={stats.stopped_vms} color="gray" />
                <StatCard icon={<Users size={20} />} label="Utilisateurs" value={stats.total_users} color="violet" />
              </>
            )}
          </div>
        )}

        {/* Tab: Users */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Pending users */}
            {pendingUsers.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-amber-400">⏳ {t('admin.pendingUsers')}</h3>
                {pendingUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-dark-900/60 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark-200">{u.username}</p>
                      <p className="text-xs text-dark-500 truncate">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="xs" variant="success" icon={<UserCheck size={12} />}
                        loading={actionLoading === u.id}
                        onClick={() => { setConfirmAction({ action: 'approve', user: u }) }}>
                        {t('admin.approve')}
                      </Button>
                      <Button size="xs" variant="danger" icon={<UserX size={12} />}
                        loading={actionLoading === u.id}
                        onClick={() => { setConfirmAction({ action: 'reject', user: u }) }}>
                        {t('admin.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All users table */}
            <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-700 text-xs font-semibold text-dark-400 uppercase tracking-wider grid grid-cols-12">
                <span className="col-span-4">Utilisateur</span>
                <span className="col-span-3">Email</span>
                <span className="col-span-2">Rôle</span>
                <span className="col-span-1">Statut</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              <div className="divide-y divide-dark-800">
                {loading ? (
                  [1,2,3].map((i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2">
                      {[1,2,3,4,5].map((j) => <div key={j} className="skeleton h-4 rounded col-span-2" />)}
                    </div>
                  ))
                ) : filteredUsers.map((u) => (
                  <div key={u.id} className="px-4 py-3 grid grid-cols-12 items-center gap-2 hover:bg-dark-800/40 transition-all">
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-dark-200 font-medium truncate">{u.username}</span>
                    </div>
                    <span className="col-span-3 text-xs text-dark-400 truncate">{u.email}</span>
                    <span className="col-span-2">
                      {u.is_admin
                        ? <span className="text-xs font-semibold text-amber-400 flex items-center gap-1"><Crown size={12} /> Admin</span>
                        : <span className="text-xs text-dark-500">User</span>}
                    </span>
                    <span className="col-span-1">
                      {u.is_verified
                        ? <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Vérifié" />
                        : <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="En attente" />}
                    </span>
                    <div className="col-span-2 flex gap-1.5 justify-end">
                      <Button size="xs" variant="ghost"
                        onClick={() => setConfirmAction({ action: 'role', user: u })}
                        title={u.is_admin ? 'Rétrograder' : 'Promouvoir admin'}>
                        <Crown size={12} />
                      </Button>
                      <Button size="xs" variant="danger"
                        onClick={() => setConfirmAction({ action: 'delete', user: u })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: VMs */}
        {tab === 'vms' && (
          <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-700 text-xs font-semibold text-dark-400 uppercase tracking-wider grid grid-cols-12">
              <span className="col-span-4">VM</span>
              <span className="col-span-2">Propriétaire</span>
              <span className="col-span-2">Specs</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">IP / SSH</span>
            </div>
            <div className="divide-y divide-dark-800">
              {loading ? [1,2,3].map((i) => (
                <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2">
                  {[1,2,3,4,5].map((j) => <div key={j} className="skeleton h-4 rounded col-span-2" />)}
                </div>
              )) : filteredVMs.map((vm) => (
                <div key={vm.id} className="px-4 py-3 grid grid-cols-12 items-center gap-2 hover:bg-dark-800/40 transition-all">
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-medium text-dark-200 truncate font-mono">{vm.name}</p>
                    <p className="text-xs text-dark-500 capitalize">{vm.os_type}</p>
                  </div>
                  <span className="col-span-2 text-xs text-dark-400">{vm.owner_username}</span>
                  <span className="col-span-2 text-xs text-dark-500">{vm.vcpu}v · {vm.ram_mb}MB</span>
                  <span className="col-span-2"><StatusBadge status={vm.status} /></span>
                  <div className="col-span-2 text-xs font-mono text-dark-400">
                    {vm.ip_address || '—'}{vm.ssh_port && <span className="ml-1 text-dark-600">:{vm.ssh_port}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Audit logs */}
        {tab === 'audit' && (
          <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                {auditTotal} entrées
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dark-800">
                    {['Date', 'Utilisateur', 'Action', 'Statut', 'IP', 'Détails'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-dark-500 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-dark-800/40 transition-all">
                      <td className="px-4 py-2 text-dark-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-dark-300">{log.username || '—'}</td>
                      <td className="px-4 py-2"><code className="text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded text-[10px]">{log.action}</code></td>
                      <td className="px-4 py-2">
                        <span className={clsx('font-semibold', log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400')}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-dark-500">{log.ip_address || '—'}</td>
                      <td className="px-4 py-2 text-dark-500 max-w-xs truncate" title={log.details}>{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm action modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => doAction(confirmAction.action, confirmAction.user.id)}
          title={
            confirmAction.action === 'approve' ? `Approuver ${confirmAction.user.username} ?` :
            confirmAction.action === 'reject' ? `Rejeter ${confirmAction.user.username} ?` :
            confirmAction.action === 'role' ? `Changer le rôle de ${confirmAction.user.username} ?` :
            `Supprimer ${confirmAction.user.username} ?`
          }
          description={
            confirmAction.action === 'delete' ? t('admin.confirmDeleteUserDesc') :
            confirmAction.action === 'role' ? (confirmAction.user.is_admin ? 'Cet utilisateur perdra ses droits admin.' : 'Cet utilisateur deviendra administrateur.') :
            undefined
          }
          confirmLabel={
            confirmAction.action === 'approve' ? t('admin.approve') :
            confirmAction.action === 'reject' ? t('admin.reject') :
            confirmAction.action === 'delete' ? t('admin.deleteUser') :
            'Confirmer'
          }
          confirmVariant={['reject', 'delete'].includes(confirmAction.action) ? 'danger' : 'primary'}
          loading={actionLoading === confirmAction.user.id}
        />
      )}
    </Layout>
  )
}
