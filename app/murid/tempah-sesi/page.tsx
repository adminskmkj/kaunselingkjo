'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type SessionInsertClient = {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => Promise<{ error: Error | null }>
  }
}

export default function TempahSesiPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTime, setSessionTime] = useState('')
  const [purpose, setPurpose] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (profile.role !== 'student') {
      router.push('/dashboard')
    }
  }, [authLoading, profile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!profile) {
      setError('Sesi tidak sah. Sila login semula.')
      return
    }

    setSaving(true)
    try {
      const { error: insertError } = await (supabase as unknown as SessionInsertClient)
        .from('counseling_sessions')
        .insert({
          student_id: profile.id,
          counselor_id: null,
          session_date: sessionDate,
          session_time: sessionTime,
          purpose,
          status: 'pending',
          reminder_sent: false,
        })

      if (insertError) throw insertError

      setSaved(true)
      setTimeout(() => router.push('/murid/sesi'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghantar permohonan sesi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalShell title="Tempah Sesi Kaunseling" subtitle="Pilih masa sesuai dan nyatakan tujuan ringkas.">
      <form onSubmit={handleSubmit} className="max-w-2xl rounded-lg bg-white p-6 shadow">
        {saved && <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">Permohonan sesi telah direkodkan.</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">Tarikh
            <input
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={saving}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">Masa
            <input
              type="time"
              required
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={saving}
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-gray-700">Tujuan
          <textarea
            required
            rows={5}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Contoh: Saya ingin berbincang tentang motivasi belajar..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            disabled={saving}
          />
        </label>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => router.push('/murid/sesi')} className="rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-700 hover:bg-gray-300" disabled={saving}>
            Batal
          </button>
          <button className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-60" disabled={saving}>
            {saving ? 'Menghantar...' : 'Hantar Permohonan'}
          </button>
        </div>
      </form>
    </PortalShell>
  )
}
