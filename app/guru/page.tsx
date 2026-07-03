'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type StudentRow = {
  id: string
  full_name: string
  class_name: string | null
  total_points: number
  streak: number
  risk: string
}

type BehaviourRecord = {
  id: string
  student_id: string
  record_type: string
  description: string
  record_date: string
  full_name?: string
}

const riskColor: Record<string, string> = {
  hijau: 'bg-emerald-100 text-emerald-700',
  kuning: 'bg-yellow-100 text-yellow-700',
  jingga: 'bg-orange-100 text-orange-700',
  merah: 'bg-rose-100 text-rose-700',
}

export default function GuruDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [activities, setActivities] = useState<BehaviourRecord[]>([])
  const [loading, setLoading] = useState(true)

  // form
  const [selStudent, setSelStudent] = useState('')
  const [recType, setRecType] = useState('merit')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formErr, setFormErr] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (!['class_teacher','discipline_teacher','counselor','admin'].includes(profile.role)) {
      router.push('/dashboard'); return
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchAll() {
    setLoading(true)
    try {
      // murid + points + risk
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, class_name')
        .eq('role', 'student')
        .order('full_name')

      const studentList = profileData || []

      // points
      const { data: pointsRaw } = await supabase
        .from('points_tracker')
        .select('student_id, total_points, current_streak')

      const pointsData = (pointsRaw || []) as { student_id: string; total_points: number; current_streak: number }[]
      const pointsMap: Record<string, { total_points: number; current_streak: number }> = {}
      for (const p of pointsData) pointsMap[p.student_id] = p

      // risk
      const { data: riskRaw } = await supabase
        .from('risk_levels')
        .select('student_id, level')
        .eq('is_active', true)

      const riskData = (riskRaw || []) as { student_id: string; level: string }[]
      const riskMap: Record<string, string> = {}
      for (const r of riskData) riskMap[r.student_id] = r.level

      setStudents(
        studentList.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          class_name: s.class_name,
          total_points: pointsMap[s.id]?.total_points ?? 0,
          streak: pointsMap[s.id]?.current_streak ?? 0,
          risk: riskMap[s.id] ?? 'hijau',
        }))
      )

      // recent activities
      const { data: actData } = await supabase
        .from('behavior_records')
        .select('id, student_id, record_type, description, record_date')
        .order('record_date', { ascending: false })
        .limit(8)

      // attach names
      const actWithNames = (actData || []).map((a) => ({
        ...a,
        full_name: studentList.find((s) => s.id === a.student_id)?.full_name ?? 'Murid',
      }))
      setActivities(actWithNames)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormErr(''); setSaved(false)
    if (!selStudent) { setFormErr('Pilih murid.'); return }
    if (!desc.trim()) { setFormErr('Isikan keterangan.'); return }
    setSaving(true)
    try {
      const points = recType === 'merit' ? 5 : recType === 'discipline_case' ? -5 : 0
      const { error } = await supabase.from('behavior_records').insert({
        student_id: selStudent,
        record_type: recType,
        description: desc,
        points,
        recorded_by: profile?.id,
        record_date: new Date().toISOString().split('T')[0],
      })
      if (error) throw error
      setSaved(true); setSelStudent(''); setDesc('')
      fetchAll()
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Gagal simpan.')
    } finally {
      setSaving(false)
    }
  }

  // derive stats
  const totalMurid = students.length
  const avgPoints = totalMurid ? Math.round(students.reduce((a, s) => a + s.total_points, 0) / totalMurid) : 0
  const amaran = students.filter((s) => s.risk === 'jingga' || s.risk === 'merah').length
  const cemerlang = students.filter((s) => s.total_points >= 800).length

  // taburan
  const taburan = [
    { label: 'Cemerlang', count: students.filter((s) => s.total_points >= 800).length, color: 'bg-emerald-500' },
    { label: 'Baik', count: students.filter((s) => s.total_points >= 600 && s.total_points < 800).length, color: 'bg-blue-500' },
    { label: 'Sederhana', count: students.filter((s) => s.total_points >= 400 && s.total_points < 600).length, color: 'bg-yellow-400' },
    { label: 'Perlu Bimbingan', count: students.filter((s) => s.total_points < 400).length, color: 'bg-rose-500' },
  ]

  if (authLoading || loading) return (
    <PortalShell title="Dashboard Guru">
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-slate-500">Memuatkan data kelas...</p>
        </div>
      </div>
    </PortalShell>
  )

  return (
    <PortalShell
      title="Dashboard Guru Kelas"
      subtitle={`Kelas ${profile?.class_name || 'Anda'} — pemantauan disiplin dan perkembangan murid`}
    >
      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Jumlah Murid" value={totalMurid} icon="👨‍🎓" tone="blue" />
        <StatCard label="Purata Mata" value={avgPoints} icon="⭐" tone="purple" subtitle="Semua murid" />
        <StatCard label="Cemerlang" value={cemerlang} icon="🏆" tone="green" subtitle="≥800 mata" />
        <StatCard label="Perlu Perhatian" value={amaran} icon="⚠️" tone="red" subtitle="Risiko jingga/merah" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Senarai Murid */}
        <section className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-black text-slate-900">Ringkasan Murid Kelas</h2>
              <p className="text-sm text-slate-500">{totalMurid} murid terdaftar</p>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada murid dalam sistem.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {students.slice(0, 15).map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/70 transition">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow">
                      {s.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{s.full_name}</p>
                      <p className="text-xs text-slate-400">{s.class_name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-700">{s.total_points} <span className="text-xs font-medium text-slate-400">mata</span></p>
                      <p className="text-xs text-slate-400">🔥 {s.streak} hari</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${riskColor[s.risk] ?? riskColor.hijau}`}>
                      {s.risk}
                    </span>
                  </div>
                ))}
                {students.length > 15 && (
                  <p className="px-6 py-3 text-center text-xs text-slate-400">+{students.length - 15} lagi</p>
                )}
              </div>
            )}
          </div>

          {/* Taburan Tahap */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/60">
            <h2 className="mb-4 text-lg font-black text-slate-900">Taburan Tahap Disiplin</h2>
            <div className="space-y-3">
              {taburan.map((t) => {
                const pct = totalMurid ? Math.round((t.count / totalMurid) * 100) : 0
                return (
                  <div key={t.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{t.label}</span>
                      <span className="font-black text-slate-900">{t.count} murid ({pct}%)</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-3 rounded-full ${t.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Sidebar kanan */}
        <section className="space-y-6">
          {/* Form tambah rekod */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-black text-slate-900">Tambah Rekod Disiplin</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Murid</label>
                <select
                  value={selStudent}
                  onChange={(e) => setSelStudent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— Pilih murid —</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Jenis</label>
                <select
                  value={recType}
                  onChange={(e) => setRecType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="merit">⭐ Merit (+5 mata)</option>
                  <option value="teacher_note">📝 Catatan Guru</option>
                  <option value="discipline_case">⚠️ Kes Disiplin (-5 mata)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Keterangan</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Hurai kejadian atau pencapaian..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
              {formErr && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{formErr}</p>}
              {saved && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">✓ Rekod disimpan!</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Rekod'}
              </button>
            </form>
          </div>

          {/* Aktiviti terkini */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-black text-slate-900">Aktiviti Terkini</h2>
            </div>
            {activities.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">Tiada rekod terkini.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {activities.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg">
                        {a.record_type === 'merit' ? '⭐' : a.record_type === 'discipline_case' ? '⚠️' : '📝'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{a.full_name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{a.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{a.record_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PortalShell>
  )
}
