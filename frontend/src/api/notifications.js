import api from './client'

export const getNotifications = async (limit = 50, offset = 0) => {
  const { data } = await api.get('/notifications', { params: { limit, offset } })
  return data
}

export const getUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count')
  return data.count
}

export const markAsRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data
}

export const markAllAsRead = async () => {
  const { data } = await api.patch('/notifications/read-all')
  return data
}

export const deleteNotification = async (id) => {
  const { data } = await api.delete(`/notifications/${id}`)
  return data
}
