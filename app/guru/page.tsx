'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type StudentRow = {
  id: string
  full_name: string
  class_name: string | null
}

type StudentClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: StudentRow[] | null; error: Error | null }>
      }
    }
    insert: (payload: Record<string, unknown>) => Promise<{ error: Error | null }>
  }
}

export default function GuruDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [recordType, setRecordType] = useState('teacher_note')
  const [description, setDescription] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (profile.role !== 'class_teacher' && profile.role !== 'discipline_teacher' && profile.role !== 'counselor' && profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    async function fetchStudents() {
      const query = (supabase as unknown as StudentClient)
        .from('profiles')
        .select('id, full_name, class_name')
        .eq('role', 'student')

      const { data, error: fetchError } = await query.order('full_name', { ascending: true })
      if (fetchError) console.error('Error fetching students:', fetchError)
      setStudents(data || [])
      setLoading(false)
    }

    fetchStudents()
  }, [authLoading, profile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (!profile) {
      setError('Sesi tidak sah. Sila login semula.')
      return
    }
    if (!selectedStudent) {
      setError('Sila pilih murid.')
      return
    }

    setSaving(true)
    try {
      const points = recordType === 'merit' ? 5 : recordType === 'discipline_case' ? -5 : 0
      const { error: insertError } = await (supabase as unknown as StudentClient)
        .from('behavior_records')
        .insert({
          student_id: selectedStudent,
          record_type: recordType,
          description,
          points,
          recorded_by: profile.id,
          record_date: new Date().toISOString().split('T')[0],
        })

      if (insertError) throw insertError
      setSaved(true)
      setSelectedStudent('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan rekod.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalShell title="Portal Guru" subtitle="Catatan guru, merit, aduan dan penghargaan murid.">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg bg-white p-6 shadow lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Senarai Murid</h2>
          {loading ? (
            <div className="rounded-lg border border-gray-100 p-6 text-center text-gray-600">Memuatkan...</div>
          ) : students.length === 0 ? (
            <div className="rounded-lg border border-gray-100 p-6 text-center text-gray-600">Belum ada murid yang boleh dipaparkan.</div>
          ) : (
            <div className="space-y-3">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{s.full_name}</p>
                    <p className="text-sm text-gray-600">{s.class_name || 'Tiada kelas'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Tambah Rekod</h2>
          {saved && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">Rekod berjaya disimpan.</div>}
          {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full rounded-lg border px-3 py-2" required disabled={saving}>
              <option value="">Pilih murid</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
            </select>
            <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className="w-full rounded-lg border px-3 py-2" disabled={saving}>
              <option value="merit">Merit / Penghargaan</option>
              <option value="discipline_case">Aduan / Disiplin</option>
              <option value="teacher_note">Catatan Guru</option>
              <option value="cocurricular">Kokurikulum</option>
            </select>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Catatan ringkas..." className="w-full rounded-lg border px-3 py-2" required disabled={saving} />
            <button className="w-full rounded-lg bg-purple-600 py-2 font-medium text-white disabled:opacity-60" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Rekod'}</button>
          </form>
        </section>
      </div>
    </PortalShell>
  )
}
