'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type BadgeRow = {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  criteria: string | null
}

type StudentBadgeRow = {
  badge_id: string
  earned_at: string
}

type BadgesClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq?: (column: string, value: string) => Promise<{ data: StudentBadgeRow[] | null; error: Error | null }>
      order?: (column: string, options: { ascending: boolean }) => Promise<{ data: BadgeRow[] | null; error: Error | null }>
    }
  }
}

export default function LencanaPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [earned, setEarned] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (profile.role !== 'student') {
      router.push('/dashboard')
      return
    }

    async function fetchBadges() {
      const client = supabase as unknown as BadgesClient
      const { data: allBadges, error: badgesError } = await client
        .from('badges')
        .select('id, name, description, icon_url, criteria')
        .order!('name', { ascending: true })

      const { data: earnedRows, error: earnedError } = await client
        .from('student_badges')
        .select('badge_id, earned_at')
        .eq!('student_id', profile!.id)

      if (badgesError) console.error('Error fetching badges:', badgesError)
      if (earnedError) console.error('Error fetching student_badges:', earnedError)

      setBadges(allBadges || [])
      setEarned(new Map((earnedRows || []).map((row) => [row.badge_id, row.earned_at])))
      setLoading(false)
    }

    fetchBadges()
  }, [authLoading, profile, router])

  return (
    <PortalShell title="Lencana Saya" subtitle="Ganjaran digital untuk tingkah laku positif dan konsisten.">
      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">Memuatkan...</div>
      ) : badges.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-3 text-5xl">🏆</div>
          <h2 className="text-lg font-bold text-gray-900">Belum ada lencana dikonfigurasi</h2>
          <p className="mt-2 text-sm text-gray-600">Lencana akan dipaparkan selepas pentadbir/GBK menambah konfigurasi lencana.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {badges.map((badge) => {
            const earnedAt = earned.get(badge.id)
            return (
              <div key={badge.id} className={`rounded-lg border bg-white p-6 text-center shadow ${earnedAt ? 'border-yellow-200' : 'border-gray-200 opacity-70'}`}>
                <div className="mb-3 text-5xl">{badge.icon_url ? '🏅' : '🏅'}</div>
                <h2 className="text-lg font-bold text-gray-900">{badge.name}</h2>
                <p className="mt-2 text-sm text-gray-600">{badge.description || badge.criteria || 'Tiada keterangan.'}</p>
                <span className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${earnedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {earnedAt ? `Dicapai ${new Date(earnedAt).toLocaleDateString('ms-MY')}` : 'Belum dicapai'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </PortalShell>
  )
}
