'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type ChildRow = {
  id: string
  full_name: string
  class_name: string | null
}

type CheckinRow = {
  id: string
  checkin_date: string
  total_score: number | null
  q7_perasaan_emosi: string | null
  q9_tahap_stres: number | null
}

type PointsRow = {
  total_points: number
  current_streak: number
}

type ParentClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: ChildRow[] | CheckinRow[] | null; error: Error | null }>
        maybeSingle: () => Promise<{ data: PointsRow | null; error: Error | null }>
      }
    }
  }
}

export default function IbuBapaPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [points, setPoints] = useState<PointsRow | null>(null)
  const [badgeCount, setBadgeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (profile.role !== 'parent' && profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    async function fetchChildren() {
      const { data, error } = await (supabase as unknown as ParentClient)
        .from('profiles')
        .select('id, full_name, class_name')
        .eq('parent_id', profile!.id)
        .order('full_name', { ascending: true })

      if (error) console.error('Error fetching children:', error)
      const rows = (data || []) as ChildRow[]
      setChildren(rows)
      if (rows.length > 0) setSelectedChildId(rows[0].id)
      setLoading(false)
    }

    fetchChildren()
  }, [authLoading, profile, router])

  useEffect(() => {
    if (!selectedChildId) {
      setCheckins([])
      setPoints(null)
      setBadgeCount(0)
      return
    }

    async function fetchChildData() {
      const client = supabase as unknown as ParentClient
      const { data: checkinData, error: checkinError } = await client
        .from('checkins')
        .select('id, checkin_date, total_score, q7_perasaan_emosi, q9_tahap_stres')
        .eq('student_id', selectedChildId)
        .order('checkin_date', { ascending: false })

      const { data: pointsData, error: pointsError } = await client
        .from('points_tracker')
        .select('total_points, current_streak')
        .eq('student_id', selectedChildId)
        .maybeSingle()

      const { data: badgeRows, error: badgeError } = await client
        .from('student_badges')
        .select('id')
        .eq('student_id', selectedChildId)
        .order('id', { ascending: true })

      if (checkinError) console.error('Error fetching child checkins:', checkinError)
      if (pointsError) console.error('Error fetching child points:', pointsError)
      if (badgeError) console.error('Error fetching child badges:', badgeError)

      setCheckins((checkinData || []) as CheckinRow[])
      setPoints(pointsData)
      setBadgeCount((badgeRows || []).length)
    }

    fetchChildData()
  }, [selectedChildId])

  const selectedChild = children.find((child) => child.id === selectedChildId)
  const latestScore = checkins[0]?.total_score

  return (
    <PortalShell title="Portal Ibu Bapa" subtitle="Paparan ringkas perkembangan anak. Nota dalaman guru/GBK tidak dipaparkan.">
      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">Memuatkan...</div>
      ) : children.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-3 text-5xl">👪</div>
          <h2 className="text-lg font-bold text-gray-900">Belum ada anak dipautkan</h2>
          <p className="mt-2 text-sm text-gray-600">Hubungi pentadbir untuk pautkan akaun ibu bapa kepada profil murid.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <label className="block text-sm font-medium text-gray-700">Pilih anak</label>
            <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 md:max-w-md">
              {children.map((child) => (
                <option key={child.id} value={child.id}>{child.full_name} {child.class_name ? `(${child.class_name})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Skor Terkini" value={latestScore == null ? '--' : `${latestScore.toFixed(0)}%`} icon="📊" tone="blue" />
            <StatCard label="Streak" value={`${points?.current_streak || 0} hari`} icon="🔥" tone="orange" />
            <StatCard label="Lencana" value={badgeCount} icon="🏆" tone="purple" />
          </div>

          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Perkembangan {selectedChild?.full_name}</h2>
            {checkins.length === 0 ? (
              <p className="text-sm text-gray-600">Belum ada refleksi direkodkan.</p>
            ) : (
              <div className="space-y-3">
                {checkins.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{c.checkin_date}</p>
                      <p className="text-sm text-gray-600">Emosi: {c.q7_perasaan_emosi || '-'} • Stres: {c.q9_tahap_stres ?? '-'}</p>
                    </div>
                    <span className="font-bold text-blue-600">{c.total_score == null ? '-' : `${c.total_score.toFixed(0)}%`}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PortalShell>
  )
}
