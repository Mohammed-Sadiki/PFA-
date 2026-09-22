import { useState, useCallback } from 'react'

let toastId = 0

// Singleton toast state — exposed via a simple event emitter pattern
const listeners = new Set()

export function emit(toast) {
  listeners.forEach((fn) => fn(toast))
}

export function useToastEmitter() {
  const subscribe = useCallback((fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return { subscribe }
}

export function useToast() {
  const toast = useCallback((options) => {
    const id = ++toastId
    emit({ id, ...options })
    return id
  }, [])

  return {
    success: (message, title) => toast({ type: 'success', message, title }),
    error: (message, title) => toast({ type: 'error', message, title }),
    info: (message, title) => toast({ type: 'info', message, title }),
    warning: (message, title) => toast({ type: 'warning', message, title }),
  }
}
