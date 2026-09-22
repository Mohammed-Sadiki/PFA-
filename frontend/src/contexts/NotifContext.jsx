import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getNotifications, getUnreadCount, markAllAsRead as apiMarkAllRead } from '../api/notifications'
import { useAuth } from './AuthContext'

const NotifContext = createContext(null)

export function NotifProvider({ children }) {
  const { token, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)
  const pingRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const data = await getNotifications(30)
      setNotifications(data)
      const count = data.filter((n) => !n.is_read).length
      setUnreadCount(count)
    } catch { /* ignore */ }
  }, [token])

  // WebSocket connection
  useEffect(() => {
    if (!token || !user) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const url = `${protocol}://${host}/ws?token=${token}`

    const connect = () => {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        // Ping every 25 seconds to keep alive
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        }, 25000)
      }

      ws.onmessage = (e) => {
        if (e.data === 'pong') return
        try {
          const msg = JSON.parse(e.data)
          handleWsEvent(msg)
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        setWsConnected(false)
        clearInterval(pingRef.current)
        // Reconnect after 3s
        setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()
    fetchNotifications()

    return () => {
      clearInterval(pingRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [token, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWsEvent = useCallback((msg) => {
    const { event } = msg
    // Re-fetch notifications on relevant events
    const notifEvents = [
      'VM_PROVISION_FINISHED', 'VM_STATUS_UPDATED', 'VM_DELETED', 'VM_CREATED',
      'USER_APPROVED', 'USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT',
      'VM_STATS_UPDATED', 'USER_ROLE_UPDATED',
    ]
    if (notifEvents.includes(event)) {
      fetchNotifications()
    }
    // Dispatch a custom DOM event so any component can listen
    window.dispatchEvent(new CustomEvent('ws:message', { detail: msg }))
  }, [fetchNotifications])

  const markAllRead = useCallback(async () => {
    await apiMarkAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, wsConnected,
      fetchNotifications, markAllRead,
    }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotif = () => {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotif must be used within NotifProvider')
  return ctx
}
