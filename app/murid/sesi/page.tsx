'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type SessionRow = {
  id: string
  session_date: string
  session_time: string
  purpose: string | null
  status: 'pending' | 'disahkan' | 'selesai' | 'dibatalkan'
}

type SessionsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: SessionRow[] | null; error: Error | null }>
      }
    }
  }
}

const statusStyle: Record<SessionRow['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  disahkan: 'bg-primary-100 text-primary-700',
  selesai: 'bg-green-100 text-green-700',
  dibatalkan: 'bg-red-100 text-red-700',
}

export default function SesiMuridPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<SessionRow[]>([])
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

    async function fetchSessions() {
      const { data, error } = await (supabase as unknown as SessionsClient)
        .from('counseling_sessions')
        .select('id, session_date, session_time, purpose, status')
        .eq('student_id', profile!.id)
        .order('session_date', { ascending: false })

      if (error) console.error('Error fetching counseling sessions:', error)
      setSessions(data || [])
      setLoading(false)
    }

    fetchSessions()
  }, [authLoading, profile, router])

  return (
    <PortalShell title="Sesi Kaunseling" subtitle="Senarai permohonan dan sesi yang telah dijadualkan.">
      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">Memuatkan...</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-3 text-5xl">📅</div>
          <h2 className="text-lg font-bold text-gray-900">Belum ada tempahan sesi</h2>
          <p className="mt-2 text-sm text-gray-600">Jika perlukan bimbingan, buat permohonan sesi dengan GBK.</p>
          <button onClick={() => router.push('/murid/tempah-sesi')} className="mt-5 rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700">
            Tempah Sesi
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-lg bg-white p-5 shadow">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold text-gray-900">{s.session_date} • {s.session_time}</p>
                  <p className="text-sm text-gray-600">{s.purpose || 'Tiada tujuan dinyatakan'}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${statusStyle[s.status]}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  )
}
