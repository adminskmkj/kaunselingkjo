'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { GraduationCap, Star, Trophy, AlertTriangle } from 'lucide-react'
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

type ActivityRow = {
  id: string
  student_id: string
  record_type: string
  description: string
  record_date: string
  full_name: string
}

const riskColor: Record<string, string> = {
  hijau: 'bg-emerald-100 text-emerald-700',
  kuning: 'bg-yellow-100 text-yellow-700',
  jingga: 'bg-orange-100 text-orange-700',
  merah: 'bg-rose-100 text-rose-700',
}

const riskLabel: Record<string, string> = {
  hijau: 'Baik',
  kuning: 'Perhatian',
  jingga: 'Amaran',
  merah: 'Kritikal',
}

export default function GuruDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // form state
  const [selStudent, setSelStudent] = useState('')
  const [recType, setRecType] = useState('merit')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formErr, setFormErr] = useState('')

  const myClass = profile?.class_name

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (!['class_teacher', 'discipline_teacher', 'counselor', 'admin'].includes(profile.role)) {
      router.push('/dashboard'); return
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchAll() {
    setLoading(true)
    try {
      // murid dalam kelas guru ini sahaja
      const profileQuery = supabase
        .from('profiles')
        .select('id, full_name, class_name')
        .eq('role', 'student')
        .order('full_name')

      // admin/counselor nampak semua, guru kelas nampak kelas sendiri
      const { data: profileRaw } =
        myClass && profile?.role !== 'admin'
          ? await profileQuery.eq('class_name', myClass)
          : await profileQuery

      const studentList = (profileRaw || []) as { id: string; full_name: string; class_name: string | null }[]
      const ids = studentList.map((s) => s.id)

      // points
      const { data: pointsRaw } = ids.length
        ? await supabase.from('points_tracker').select('student_id, total_points, current_streak').in('student_id', ids)
        : { data: [] }
      const pointsData = (pointsRaw || []) as { student_id: string; total_points: number; current_streak: number }[]
      const pointsMap: Record<string, { total_points: number; current_streak: number }> = {}
      for (const p of pointsData) pointsMap[p.student_id] = p

      // risk
      const { data: riskRaw } = ids.length
        ? await supabase.from('risk_levels').select('student_id, level').eq('is_active', true).in('student_id', ids)
        : { data: [] }
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

      // aktiviti terkini — kelas ini sahaja
      const { data: actRaw } = ids.length
        ? await supabase
            .from('behavior_records')
            .select('id, student_id, record_type, description, record_date')
            .in('student_id', ids)
            .order('record_date', { ascending: false })
            .limit(10)
        : { data: [] }
      const actData = (actRaw || []) as { id: string; student_id: string; record_type: string; description: string; record_date: string }[]
      setActivities(
        actData.map((a) => ({
          ...a,
          full_name: studentList.find((s) => s.id === a.student_id)?.full_name ?? 'Murid',
        }))
      )
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('behavior_records').insert({
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

  // derived stats — kelas ini
  const total = students.length
  const amaran = students.filter((s) => s.risk === 'jingga' || s.risk === 'merah').length
  const cemerlang = students.filter((s) => s.total_points >= 800).length
  const avgPts = total ? Math.round(students.reduce((a, s) => a + s.total_points, 0) / total) : 0

  // taburan
  const taburan = [
    { label: 'Cemerlang', min: 800, max: Infinity, color: 'bg-emerald-500' },
    { label: 'Baik', min: 600, max: 799, color: 'bg-blue-500' },
    { label: 'Sederhana', min: 400, max: 599, color: 'bg-yellow-400' },
    { label: 'Perlu Bimbingan', min: 0, max: 399, color: 'bg-rose-500' },
  ].map((t) => ({ ...t, count: students.filter((s) => s.total_points >= t.min && s.total_points <= t.max).length }))

  // search filter
  const filtered = students.filter((s) =>
    search.trim() === '' || s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading || loading) return (
    <PortalShell title="Dashboard Guru">
      <div className="flex items-center justify-center py-24">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    </PortalShell>
  )

  const classLabel = myClass && profile?.role !== 'admin' ? `Kelas ${myClass}` : 'Semua Kelas'

  return (
    <PortalShell
      title={`Dashboard Guru — ${classLabel}`}
      subtitle={`${total} murid • Pemantauan disiplin dan perkembangan`}
    >
      {/* Amaran tiada kelas */}
      {!myClass && profile?.role !== 'admin' && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-medium text-yellow-800">
          ⚠️ Profil guru belum ada kelas. Sila hubungi pentadbir untuk tetapkan kelas.
        </div>
      )}

      {/* KPI */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Murid dalam Kelas" value={total} icon={<GraduationCap size={22} />} tone="blue" subtitle={classLabel} />
        <StatCard label="Purata Mata" value={avgPts} icon={<Star size={22} />} tone="purple" />
        <StatCard label="Cemerlang" value={cemerlang} icon={<Trophy size={22} />} tone="green" subtitle="≥800 mata" />
        <StatCard label="Perlu Perhatian" value={amaran} icon={<AlertTriangle size={22} />} tone="red" subtitle="Risiko jingga/merah" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Senarai murid kelas */}
        <section className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Senarai Murid {classLabel}</h2>
                  <p className="text-xs text-slate-400">{filtered.length} murid dipapar</p>
                </div>
                <input
                  type="search"
                  placeholder="Cari nama murid..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-52"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl">🏫</p>
                <p className="mt-3 font-bold text-slate-700">
                  {search ? 'Tiada murid sepadan carian.' : 'Tiada murid dalam kelas ini.'}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {!search && 'Murid akan tersenarai selepas upload dilakukan oleh pentadbir.'}
                </p>
              </div>
            ) : (
              <>
                {/* header table */}
                <div className="grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <span className="col-span-5">Nama</span>
                  <span className="col-span-2 text-right">Mata</span>
                  <span className="col-span-2 text-right">Streak</span>
                  <span className="col-span-3 text-right">Status</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {filtered.map((s) => (
                    <div key={s.id} className="grid grid-cols-12 items-center gap-2 px-6 py-3 transition hover:bg-slate-50/60">
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-700 text-xs font-bold text-white">
                          {s.full_name.charAt(0)}
                        </div>
                        <span className="truncate text-sm font-semibold text-slate-900">{s.full_name}</span>
                      </div>
                      <span className="col-span-2 text-right text-sm font-black text-blue-700">{s.total_points}</span>
                      <span className="col-span-2 text-right text-sm text-slate-500">🔥 {s.streak}h</span>
                      <div className="col-span-3 flex justify-end">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${riskColor[s.risk] ?? riskColor.hijau}`}>
                          {riskLabel[s.risk] ?? s.risk}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Taburan */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/60">
            <h2 className="mb-4 text-base font-black text-slate-900">Taburan Tahap Disiplin — {classLabel}</h2>
            <div className="space-y-3">
              {taburan.map((t) => {
                const pct = total ? Math.round((t.count / total) * 100) : 0
                return (
                  <div key={t.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{t.label}</span>
                      <span className="font-black text-slate-900">{t.count} murid ({pct}%)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-2.5 rounded-full transition-all duration-700 ${t.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <section className="space-y-6">
          {/* Form */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-black text-slate-900">Tambah Rekod Disiplin</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <select
                value={selStudent}
                onChange={(e) => setSelStudent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">— Pilih murid kelas —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="merit">⭐ Merit (+5 mata)</option>
                <option value="teacher_note">📝 Catatan Guru</option>
                <option value="discipline_case">⚠️ Kes Disiplin (-5 mata)</option>
              </select>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="Hurai kejadian atau pencapaian..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {formErr && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{formErr}</p>}
              {saved && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">✓ Rekod disimpan!</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-700 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 disabled:opacity-50"
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
              <p className="p-6 text-center text-sm text-slate-400">Tiada rekod terkini untuk kelas ini.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 px-5 py-3">
                    <span className="mt-0.5 text-base">
                      {a.record_type === 'merit' ? '⭐' : a.record_type === 'discipline_case' ? '⚠️' : '📝'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{a.full_name}</p>
                      <p className="line-clamp-1 text-xs text-slate-500">{a.description}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{a.record_date}</p>
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
