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
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <ShieldCheck size={24} className="text-primary-500" />
              {t('admin.title')}
            </h1>
            {pendingUsers.length > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--warning)' }}>
                ⚠️ {pendingUsers.length} compte{pendingUsers.length > 1 ? 's' : ''} en attente d'approbation
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={15} />} onClick={fetchData}>
            {t('common.refresh')}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          {TABS.map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === t_ ? 'var(--primary)' : 'transparent',
                color: tab === t_ ? 'white' : 'var(--muted-foreground)',
              }}
              onMouseEnter={e => { if (tab !== t_) { e.currentTarget.style.color = 'var(--foreground)' } }}
              onMouseLeave={e => { if (tab !== t_) { e.currentTarget.style.color = 'var(--muted-foreground)' } }}
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
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--placeholder)' }} />
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
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}
              >
                <h3 className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>⏳ {t('admin.pendingUsers')}</h3>
                {pendingUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--card)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{u.username}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{u.email}</p>
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
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider grid grid-cols-12"
                style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
              >
                <span className="col-span-4">Utilisateur</span>
                <span className="col-span-3">Email</span>
                <span className="col-span-2">Rôle</span>
                <span className="col-span-1">Statut</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              <div>
                {loading ? (
                  [1,2,3].map((i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2" style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                      {[1,2,3,4,5].map((j) => <div key={j} className="skeleton h-4 rounded col-span-2" />)}
                    </div>
                  ))
                ) : filteredUsers.map((u, idx, arr) => (
                  <div
                    key={u.id}
                    className="px-4 py-3 grid grid-cols-12 items-center gap-2 transition-all"
                    style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--primary-bg)', color: 'var(--primary)' }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{u.username}</span>
                    </div>
                    <span className="col-span-3 text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{u.email}</span>
                    <span className="col-span-2">
                      {u.is_admin
                        ? <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--warning)' }}><Crown size={12} /> Admin</span>
                        : <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>User</span>}
                    </span>
                    <span className="col-span-1">
                      {u.is_verified
                        ? <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--success)' }} title="Vérifié" />
                        : <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--warning)' }} title="En attente" />}
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
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wider grid grid-cols-12"
              style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              <span className="col-span-4">VM</span>
              <span className="col-span-2">Propriétaire</span>
              <span className="col-span-2">Specs</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">IP / SSH</span>
            </div>
            <div>
              {loading ? [1,2,3].map((i) => (
                <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2" style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  {[1,2,3,4,5].map((j) => <div key={j} className="skeleton h-4 rounded col-span-2" />)}
                </div>
              )) : filteredVMs.map((vm, idx, arr) => (
                <div
                  key={vm.id}
                  className="px-4 py-3 grid grid-cols-12 items-center gap-2 transition-all"
                  style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-medium truncate font-mono" style={{ color: 'var(--foreground)' }}>{vm.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--muted-foreground)' }}>{vm.os_type}</p>
                  </div>
                  <span className="col-span-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>{vm.owner_username}</span>
                  <span className="col-span-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>{vm.vcpu}v · {vm.ram_mb}MB</span>
                  <span className="col-span-2"><StatusBadge status={vm.status} /></span>
                  <div className="col-span-2 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {vm.ip_address || '—'}{vm.ssh_port && <span style={{ color: 'var(--foreground)' }}>:{vm.ssh_port}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Audit logs */}
        {tab === 'audit' && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                {auditTotal} entrées
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {['Date', 'Utilisateur', 'Action', 'Statut', 'IP', 'Détails'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left font-semibold uppercase tracking-wider"
                        style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx, arr) => (
                    <tr
                      key={log.id}
                      className="transition-all"
                      style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2" style={{ color: 'var(--foreground)' }}>{log.username || '—'}</td>
                      <td className="px-4 py-2">
                        <code className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--primary-bg)', color: 'var(--primary)' }}>
                          {log.action}
                        </code>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-semibold" style={{ color: log.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)' }}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--muted-foreground)' }}>{log.ip_address || '—'}</td>
                      <td className="px-4 py-2 max-w-xs truncate" title={log.details} style={{ color: 'var(--muted-foreground)' }}>{log.details || '—'}</td>
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
