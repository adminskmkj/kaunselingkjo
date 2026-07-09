'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { startGbkNotifyWatch } from '@/lib/gbk-notify'

export function PwaRegister() {
  const { profile } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let stopWatch: (() => void) | undefined

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Counselor / admin: browser notifications for Reach Out & overdue
        if (profile?.role === 'counselor' || profile?.role === 'admin') {
          stopWatch = startGbkNotifyWatch(reg, profile.id)
        }
      })
      .catch((err) => console.warn('SW register failed', err))

    return () => {
      stopWatch?.()
    }
  }, [profile?.id, profile?.role])

  return null
}
