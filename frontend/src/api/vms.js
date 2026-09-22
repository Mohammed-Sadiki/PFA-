import api from './client'

export const listVMs = async () => {
  const { data } = await api.get('/vms/')
  return data
}

export const getVM = async (id) => {
  const { data } = await api.get(`/vms/${id}`)
  return data
}

export const createVM = async (payload) => {
  // payload: { vcpu, ram_mb, disk_gb, password, os_type }
  const { data } = await api.post('/vms/', payload)
  return data
}

export const startVM = async (id) => {
  const { data } = await api.post(`/vms/${id}/start`)
  return data
}

export const stopVM = async (id) => {
  const { data } = await api.post(`/vms/${id}/stop`)
  return data
}

export const deleteVM = async (id) => {
  const { data } = await api.delete(`/vms/${id}`)
  return data
}

export const getVMLogs = async (id) => {
  const { data } = await api.get(`/vms/${id}/logs`)
  return data
}

export const getVMMetrics = async (id) => {
  const { data } = await api.get(`/vms/${id}/metrics`)
  return data
}
