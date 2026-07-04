'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Tables']['profiles']['Row']['role']

export type ReachOutBadgeCounts = {
  gbkNew: number
  studentUnreadReplies: number
}

const EMPTY: ReachOutBadgeCounts = { gbkNew: 0, studentUnreadReplies: 0 }

export function useReachOutBadges(role: UserRole | undefined, userId: string | undefined) {
  const [counts, setCounts] = useState<ReachOutBadgeCounts>(EMPTY)

  const refresh = useCallback(async () => {
    if (!role || !userId) {
      setCounts(EMPTY)
      return
    }

    try {
      if (role === 'counselor' || role === 'admin') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count, error } = await (supabase as any)
          .from('reach_out_messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'baru')
        if (error) throw error
        setCounts({ gbkNew: count ?? 0, studentUnreadReplies: 0 })
        return
      }

      if (role === 'student') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count, error } = await (supabase as any)
          .from('reach_out_messages')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', userId)
          .eq('student_seen_reply', false)
          .not('reply_message', 'is', null)
        if (error) throw error
        setCounts({ gbkNew: 0, studentUnreadReplies: count ?? 0 })
        return
      }

      setCounts(EMPTY)
    } catch {
      setCounts(EMPTY)
    }
  }, [role, userId])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 45_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    const onBadgeRefresh = () => void refresh()
    window.addEventListener('reach-out-badge-refresh', onBadgeRefresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('reach-out-badge-refresh', onBadgeRefresh)
    }
  }, [refresh])

  return { counts, refresh }
}

export async function markStudentReachOutRepliesSeen(studentId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reach_out_messages')
    .update({ student_seen_reply: true })
    .eq('student_id', studentId)
    .eq('student_seen_reply', false)
  if (error) throw error
}