'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type CheckinRow = {
  id: string
  checkin_date: string
  total_score: number | null
  q7_perasaan_emosi: string | null
  q9_tahap_stres: number | null
  q10_perlukan_bantuan: string | null
}

type CheckinClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: CheckinRow[] | null; error: Error | null }>
      }
    }
  }
}

export default function SejarahRefleksiPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<CheckinRow[]>([])
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

    async function fetchRows() {
      const { data, error } = await (supabase as unknown as CheckinClient)
        .from('checkins')
        .select('id, checkin_date, total_score, q7_perasaan_emosi, q9_tahap_stres, q10_perlukan_bantuan')
        .eq('student_id', profile!.id)
        .order('checkin_date', { ascending: false })

      if (error) console.error('Error fetching checkins:', error)
      setRows(data || [])
      setLoading(false)
    }

    fetchRows()
  }, [authLoading, profile, router])

  return (
    <PortalShell title="Sejarah Refleksi" subtitle="Rekod refleksi harian anda daripada data sebenar.">
      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">Memuatkan...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-3 text-5xl">📝</div>
          <h2 className="text-lg font-bold text-gray-900">Belum ada rekod refleksi</h2>
          <p className="mt-2 text-sm text-gray-600">Isi refleksi harian pertama anda untuk melihat sejarah di sini.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Tarikh', 'Skor', 'Emosi', 'Stres', 'Perlu Bantuan'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.checkin_date}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600">{row.total_score == null ? '-' : `${row.total_score.toFixed(0)}%`}</td>
                  <td className="px-6 py-4 text-sm capitalize text-gray-700">{row.q7_perasaan_emosi || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.q9_tahap_stres ?? '-'}</td>
                  <td className="px-6 py-4 text-sm capitalize text-gray-700">{row.q10_perlukan_bantuan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  )
}
