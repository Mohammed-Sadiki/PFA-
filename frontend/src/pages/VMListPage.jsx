import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Server, Play, Square, Trash2, PlusCircle, RefreshCw,
  Search, Filter, ChevronDown, SortAsc
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { listVMs, startVM, stopVM, deleteVM } from '../api/vms'
import Layout from '../components/layout/Layout'
import VMCard from '../components/vm/VMCard'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonCard } from '../components/ui/Skeleton'
import { ConfirmModal } from '../components/ui/Modal'
import { useToast } from '../hooks/useToast'
import { clsx } from 'clsx'

const STATUS_FILTERS = ['all', 'running', 'stopped', 'error', 'creating', 'pending']
const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Plus récent' },
  { value: 'created_asc', label: 'Plus ancien' },
  { value: 'name_asc', label: 'Nom A→Z' },
  { value: 'name_desc', label: 'Nom Z→A' },
]

export default function VMListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const [vms, setVMs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('created_desc')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  const fetchVMs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await listVMs()
      setVMs(data)
    } catch {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchVMs()
    // Listen for WS VM events
    const handler = (e) => {
      const { event } = e.detail
      if (['VM_STATUS_UPDATED', 'VM_DELETED', 'VM_CREATED', 'VM_PROVISION_FINISHED'].includes(event)) {
        fetchVMs(true)
      }
    }
    window.addEventListener('ws:message', handler)
    return () => window.removeEventListener('ws:message', handler)
  }, [fetchVMs])

  // Filter + sort
  const filtered = vms
    .filter((vm) => statusFilter === 'all' || vm.status === statusFilter)
    .filter((vm) => !search || vm.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sort) {
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'name_desc': return b.name.localeCompare(a.name)
        case 'created_asc': return new Date(a.created_at) - new Date(b.created_at)
        default: return new Date(b.created_at) - new Date(a.created_at)
      }
    })

  const counts = {
    all: vms.length,
    running: vms.filter((v) => v.status === 'running').length,
    stopped: vms.filter((v) => v.status === 'stopped').length,
    error: vms.filter((v) => v.status === 'error').length,
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
              <Server size={24} className="text-primary-400" />
              {t('nav.vms')}
            </h1>
            <p className="text-dark-400 text-sm mt-1">
              {vms.length} machine{vms.length !== 1 ? 's' : ''} virtuelle{vms.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              icon={<RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => fetchVMs(true)}
              disabled={refreshing}
            >
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              icon={<PlusCircle size={15} />}
              onClick={() => navigate('/create')}
            >
              {t('nav.createVm')}
            </Button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                statusFilter === s
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800 border border-transparent'
              )}
            >
              {s === 'all' ? `Tous (${counts.all})` : `${s.charAt(0).toUpperCase() + s.slice(1)}${counts[s] !== undefined ? ` (${counts[s]})` : ''}`}
            </button>
          ))}
        </div>

        {/* Search and sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('vm.search')}
              className="input-base pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="input-base pr-8 cursor-pointer appearance-none min-w-[150px]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* VM Grid / Loading / Empty */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
              <Server size={32} className="text-dark-600" />
            </div>
            <h3 className="text-lg font-semibold text-dark-300 mb-2">
              {search || statusFilter !== 'all' ? 'Aucun résultat' : t('vm.noVMs')}
            </h3>
            <p className="text-dark-500 text-sm mb-6">
              {search || statusFilter !== 'all' ? 'Modifiez vos filtres de recherche.' : t('vm.noVMsDesc')}
            </p>
            {!search && statusFilter === 'all' && (
              <Button icon={<PlusCircle size={16} />} onClick={() => navigate('/create')}>
                {t('nav.createVm')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map((vm) => (
              <VMCard key={vm.id} vm={vm} onRefresh={() => fetchVMs(true)} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
