/**
 * In-browser PWA notifications for GBK (service worker + Supabase Realtime).
 * Works when tab is open or installed as PWA (same origin). Does not require VAPID push server.
 */

import { supabase } from '@/lib/supabase'

const PERM_KEY = 'star-kjo-gbk-notify-asked'
const SEEN_KEY = 'star-kjo-gbk-seen-reach'

function seenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function rememberSeen(id: string) {
  const s = seenSet()
  s.add(id)
  const arr = [...s].slice(-80)
  localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
}

async function ensurePermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  // Ask once per browser profile (soft)
  if (sessionStorage.getItem(PERM_KEY) === '1') return false
  sessionStorage.setItem(PERM_KEY, '1')
  const p = await Notification.requestPermission()
  return p === 'granted'
}

function showViaSw(
  reg: ServiceWorkerRegistration,
  title: string,
  body: string,
  url: string,
  tag: string
) {
  const sw = reg.active || navigator.serviceWorker.controller
  if (sw) {
    sw.postMessage({ type: 'SHOW_NOTIFICATION', title, body, url, tag })
    return
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo-sekolah.png', tag })
  }
}

/**
 * Start watching for GBK alerts. Returns cleanup fn.
 */
export function startGbkNotifyWatch(
  reg: ServiceWorkerRegistration,
  counselorId: string
): () => void {
  let cancelled = false
  let channel: ReturnType<typeof supabase.channel> | null = null

  ;(async () => {
    const ok = await ensurePermission()
    if (!ok || cancelled) return

    // Realtime: new reach_out from murid / guru
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel = (supabase as any)
      .channel(`gbk-notify-${counselorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reach_out_messages',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload.new as {
            id: string
            source?: string
            status?: string
            student_id?: string
            counselor_id?: string | null
            message?: string
          }
          if (!row?.id) return
          if (row.source === 'gbk') return
          if (row.counselor_id && row.counselor_id !== counselorId) return
          if (seenSet().has(row.id)) return
          rememberSeen(row.id)
          const who = row.source === 'guru' ? 'Guru' : 'Murid'
          showViaSw(
            reg,
            `Reach Out baharu (${who})`,
            (row.message || 'Mesej baharu dalam inbox').slice(0, 120),
            '/gbk/reach-out',
            `reach-${row.id}`
          )
        }
      )
      .subscribe()

    // Poll overdue cases every 5 min while session open
    const checkOverdue = async () => {
      if (cancelled) return
      try {
        const today = new Date().toISOString().split('T')[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('intervention_records')
          .select('id, student_id, tarikh_susulan')
          .neq('case_status', 'selesai')
          .not('tarikh_susulan', 'is', null)
          .lt('tarikh_susulan', today)
          .limit(5)

        const rows = (data || []) as { id: string; tarikh_susulan: string }[]
        if (rows.length === 0) return
        const tag = `overdue-${today}`
        if (seenSet().has(tag)) return
        rememberSeen(tag)
        showViaSw(
          reg,
          'Kes lewat susulan',
          `${rows.length}+ kes melepasi tarikh susulan. Semak Pengurusan Kes.`,
          '/gbk/kes',
          tag
        )
      } catch {
        /* ignore poll errors */
      }
    }

    await checkOverdue()
    const interval = window.setInterval(checkOverdue, 5 * 60 * 1000)

    // stash interval on channel for cleanup via closed over var
    ;(channel as unknown as { __interval?: number }).__interval = interval
  })()

  return () => {
    cancelled = true
    if (channel) {
      const interval = (channel as unknown as { __interval?: number }).__interval
      if (interval) window.clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }
}
