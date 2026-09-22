import api from './client'

export const getAdminStats = async () => {
  const { data } = await api.get('/admin/stats')
  return data
}

export const getAllVMs = async () => {
  const { data } = await api.get('/admin/vms')
  return data
}

export const getAllUsers = async () => {
  const { data } = await api.get('/admin/users')
  return data
}

export const getPendingUsers = async () => {
  const { data } = await api.get('/admin/pending-users')
  return data
}

export const approveUser = async (userId) => {
  const { data } = await api.post(`/admin/users/${userId}/approve`)
  return data
}

export const rejectUser = async (userId) => {
  const { data } = await api.post(`/admin/users/${userId}/reject`)
  return data
}

export const updateUserRole = async (userId) => {
  const { data } = await api.patch(`/admin/users/${userId}/role`)
  return data
}

export const deleteUser = async (userId) => {
  const { data } = await api.delete(`/admin/users/${userId}`)
  return data
}

export const getAuditLogs = async (params = {}) => {
  const { data } = await api.get('/admin/audit-logs', { params })
  return data
}

export const getAllVMMetrics = async () => {
  const { data } = await api.get('/admin/metrics')
  return data
}
