'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GraduationCap,
  Star,
  Trophy,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Send,
  ChevronRight,
  Users,
} from 'lucide-react'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { ModalOverlay } from '@/components/modal-overlay'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type RiskLevel = 'hijau' | 'kuning' | 'jingga' | 'merah'

type StudentRow = {
  id: string
  full_name: string
  class_name: string | null
  total_points: number
  streak: number
  risk: RiskLevel
  last_checkin: string | null
  last_score: number | null
}

type ActivityRow = {
  id: string
  student_id: string
  record_type: string
  description: string
  record_date: string
  points: number
  full_name: string
}

const riskColor: Record<RiskLevel, string> = {
  hijau: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  kuning: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  jingga: 'bg-orange-100 text-orange-800 ring-orange-200',
  merah: 'bg-rose-100 text-rose-800 ring-rose-200',
}

const riskLabel: Record<RiskLevel, string> = {
  hijau: 'Baik',
  kuning: 'Perhatian',
  jingga: 'Amaran',
  merah: 'Kritikal',
}

const recordTypeLabel: Record<string, string> = {
  merit: 'Merit',
  discipline_case: 'Kes Disiplin',
  teacher_note: 'Catatan Guru',
  attendance: 'Kehadiran',
  cocurricular: 'Kokurikulum',
  self_reflection: 'Refleksi',
}

export default function GuruDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [allClasses, setAllClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'risk'>('name')

  // form state
  const [selStudent, setSelStudent] = useState('')
  const [recType, setRecType] = useState('merit')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formErr, setFormErr] = useState('')

  // referral state
  const [refStudent, setRefStudent] = useState<StudentRow | null>(null)
  const [refMsg, setRefMsg] = useState('')
  const [refSaving, setRefSaving] = useState(false)
  const [refSaved, setRefSaved] = useState(false)

  const role = profile?.role
  const myClass = profile?.class_name || null
  const isClassTeacher = role === 'class_teacher'
  const canPickClass = role === 'discipline_teacher' || role === 'admin' || role === 'counselor'

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (!['class_teacher', 'discipline_teacher', 'counselor', 'admin'].includes(profile.role)) {
      router.push('/dashboard')
      return
    }
    // default class filter for class teacher
    if (profile.role === 'class_teacher' && profile.class_name) {
      setClassFilter(profile.class_name)
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.id])

  async function fetchAll() {
    setLoading(true)
    setFetchError('')
    try {
      // Guru kelas tanpa class_name: jangan bocor senarai semua murid
      if (isClassTeacher && !myClass) {
        setStudents([])
        setActivities([])
        setAllClasses([])
        setLoading(false)
        return
      }

      let profileQuery = supabase
        .from('profiles')
        .select('id, full_name, class_name')
        .eq('role', 'student')
        .order('full_name')

      // Guru kelas: ketat ikut kelas sendiri
      if (isClassTeacher && myClass) {
        profileQuery = profileQuery.eq('class_name', myClass)
      }

      const { data: profileRaw, error: profileErr } = await profileQuery
      if (profileErr) throw profileErr

      const studentList = (profileRaw || []) as {
        id: string
        full_name: string
        class_name: string | null
      }[]
      const ids = studentList.map((s) => s.id)

      const classes = Array.from(
        new Set(studentList.map((s) => s.class_name).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, 'ms'))
      setAllClasses(classes)

      // points
      const { data: pointsRaw } = ids.length
        ? await supabase
            .from('points_tracker')
            .select('student_id, total_points, current_streak')
            .in('student_id', ids)
        : { data: [] }
      const pointsMap: Record<string, { total_points: number; current_streak: number }> = {}
      for (const p of (pointsRaw || []) as {
        student_id: string
        total_points: number
        current_streak: number
      }[]) {
        pointsMap[p.student_id] = p
      }

      // risk (perlu migration 026 untuk staff SELECT)
      const { data: riskRaw, error: riskErr } = ids.length
        ? await supabase
            .from('risk_levels')
            .select('student_id, level')
            .eq('is_active', true)
            .in('student_id', ids)
        : { data: [], error: null }
      if (riskErr) {
        console.warn('risk_levels:', riskErr.message)
      }
      const riskMap: Record<string, RiskLevel> = {}
      for (const r of (riskRaw || []) as { student_id: string; level: RiskLevel }[]) {
        riskMap[r.student_id] = r.level
      }

      // last checkin (14 hari) — ambil terbaru per murid
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 30)
      const since = fourteenDaysAgo.toISOString().split('T')[0]
      const { data: checkinRaw } = ids.length
        ? await supabase
            .from('checkins')
            .select('student_id, checkin_date, total_score')
            .in('student_id', ids)
            .gte('checkin_date', since)
            .order('checkin_date', { ascending: false })
        : { data: [] }

      const lastCheckinMap: Record<string, { date: string; score: number | null }> = {}
      for (const c of (checkinRaw || []) as {
        student_id: string
        checkin_date: string
        total_score: number | null
      }[]) {
        if (!lastCheckinMap[c.student_id]) {
          lastCheckinMap[c.student_id] = { date: c.checkin_date, score: c.total_score }
        }
      }

      setStudents(
        studentList.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          class_name: s.class_name,
          total_points: pointsMap[s.id]?.total_points ?? 0,
          streak: pointsMap[s.id]?.current_streak ?? 0,
          risk: riskMap[s.id] ?? 'hijau',
          last_checkin: lastCheckinMap[s.id]?.date ?? null,
          last_score: lastCheckinMap[s.id]?.score ?? null,
        }))
      )

      // aktiviti terkini
      const { data: actRaw } = ids.length
        ? await supabase
            .from('behavior_records')
            .select('id, student_id, record_type, description, record_date, points')
            .in('student_id', ids)
            .order('record_date', { ascending: false })
            .limit(12)
        : { data: [] }

      const actData = (actRaw || []) as {
        id: string
        student_id: string
        record_type: string
        description: string
        record_date: string
        points: number
      }[]
      setActivities(
        actData.map((a) => ({
          ...a,
          full_name: studentList.find((s) => s.id === a.student_id)?.full_name ?? 'Murid',
        }))
      )
    } catch (err) {
      console.error(err)
      setFetchError(err instanceof Error ? err.message : 'Gagal muat data kelas.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    setSaved(false)
    if (!selStudent) {
      setFormErr('Pilih murid.')
      return
    }
    if (!desc.trim()) {
      setFormErr('Isikan keterangan.')
      return
    }
    setSaving(true)
    try {
      const points = recType === 'merit' ? 5 : recType === 'discipline_case' ? -5 : 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('behavior_records').insert({
        student_id: selStudent,
        record_type: recType,
        description: desc.trim(),
        points,
        recorded_by: profile?.id,
        record_date: new Date().toISOString().split('T')[0],
      })
      if (error) throw error
      setSaved(true)
      setSelStudent('')
      setDesc('')
      fetchAll()
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Gagal simpan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReferralSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!refStudent || !refMsg.trim()) return
    setRefSaving(true)
    setRefSaved(false)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('reach_out_messages').insert({
        student_id: refStudent.id,
        sender_id: profile?.id,
        message: refMsg.trim(),
        source: 'guru',
        status: 'baru',
      })
      if (error) throw error
      setRefSaved(true)
      setTimeout(() => {
        setRefStudent(null)
        setRefMsg('')
        setRefSaved(false)
      }, 1200)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal hantar rujukan.')
    } finally {
      setRefSaving(false)
    }
  }

  const riskRank: Record<RiskLevel, number> = { merah: 0, jingga: 1, kuning: 2, hijau: 3 }

  const filtered = useMemo(() => {
    let list = [...students]

    if (canPickClass && classFilter !== 'all') {
      list = list.filter((s) => s.class_name === classFilter)
    }

    if (riskFilter !== 'all') {
      list = list.filter((s) => s.risk === riskFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          (s.class_name || '').toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      if (sortBy === 'points') return b.total_points - a.total_points
      if (sortBy === 'risk') return riskRank[a.risk] - riskRank[b.risk]
      return a.full_name.localeCompare(b.full_name, 'ms')
    })

    return list
  }, [students, canPickClass, classFilter, riskFilter, search, sortBy])

  const scopedStudents =
    canPickClass && classFilter !== 'all'
      ? students.filter((s) => s.class_name === classFilter)
      : students

  const total = scopedStudents.length
  const amaran = scopedStudents.filter((s) => s.risk === 'jingga' || s.risk === 'merah').length
  const cemerlang = scopedStudents.filter((s) => s.total_points >= 800).length
  const avgPts = total
    ? Math.round(scopedStudents.reduce((a, s) => a + s.total_points, 0) / total)
    : 0
  const noCheckin7d = scopedStudents.filter((s) => {
    if (!s.last_checkin) return true
    const d = new Date(s.last_checkin)
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    return days > 7
  }).length

  const taburan = [
    { label: 'Cemerlang', min: 800, max: Infinity, color: 'bg-emerald-500' },
    { label: 'Baik', min: 600, max: 799, color: 'bg-blue-500' },
    { label: 'Sederhana', min: 400, max: 599, color: 'bg-yellow-400' },
    { label: 'Perlu Bimbingan', min: 0, max: 399, color: 'bg-rose-500' },
  ].map((t) => ({
    ...t,
    count: scopedStudents.filter((s) => s.total_points >= t.min && s.total_points <= t.max)
      .length,
  }))

  const classLabel =
    isClassTeacher && myClass
      ? myClass
      : classFilter !== 'all'
        ? classFilter
        : canPickClass
          ? 'Semua Kelas'
          : myClass || 'Kelas'

  if (authLoading || loading) {
    return (
      <PortalShell title="Portal Guru" subtitle="Memuatkan data kelas...">
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      title={`Portal Guru — ${classLabel}`}
      subtitle={`${total} murid · rekod disiplin, pantau risiko, rujuk GBK`}
    >
      {/* Amaran tiada kelas (guru kelas) */}
      {isClassTeacher && !myClass && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Profil guru belum ada kelas. Hubungi pentadbir untuk tetapkan <code className="rounded bg-amber-100 px-1">class_name</code> supaya senarai murid kelas dipapar.
        </div>
      )}

      {fetchError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {fetchError}
        </div>
      )}

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Murid"
          value={total}
          icon={<Users size={22} />}
          tone="blue"
          subtitle={classLabel}
        />
        <StatCard
          label="Purata Mata"
          value={avgPts}
          icon={<Star size={22} />}
          tone="purple"
        />
        <StatCard
          label="Cemerlang"
          value={cemerlang}
          icon={<Trophy size={22} />}
          tone="green"
          subtitle="≥800 mata"
        />
        <StatCard
          label="Perlu Perhatian"
          value={amaran}
          icon={<AlertTriangle size={22} />}
          tone="red"
          subtitle={noCheckin7d > 0 ? `${noCheckin7d} tiada refleksi ≥7h` : 'Risiko jingga/merah'}
          onClick={amaran > 0 ? () => setRiskFilter(riskFilter === 'merah' ? 'jingga' : 'merah') : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Senarai murid */}
        <section className="space-y-6 lg:col-span-2">
          <div className="panel overflow-hidden !p-0">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Senarai Murid</h2>
                    <p className="text-xs text-slate-500">{filtered.length} dipapar</p>
                  </div>
                  <div className="relative sm:w-56">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      placeholder="Cari nama / kelas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input w-full pl-9"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  {canPickClass && (
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="input !w-auto !py-1.5 text-xs"
                    >
                      <option value="all">Semua kelas</option>
                      {allClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
                    className="input !w-auto !py-1.5 text-xs"
                  >
                    <option value="all">Semua risiko</option>
                    <option value="merah">Kritikal</option>
                    <option value="jingga">Amaran</option>
                    <option value="kuning">Perhatian</option>
                    <option value="hijau">Baik</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'points' | 'risk')}
                    className="input !w-auto !py-1.5 text-xs"
                  >
                    <option value="name">Susun: Nama</option>
                    <option value="points">Susun: Mata</option>
                    <option value="risk">Susun: Risiko</option>
                  </select>
                  {(riskFilter !== 'all' || search || (canPickClass && classFilter !== 'all')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRiskFilter('all')
                        setSearch('')
                        if (canPickClass) setClassFilter('all')
                      }}
                      className="text-xs font-semibold text-primary-700 hover:underline"
                    >
                      Reset penapis
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl">🏫</p>
                <p className="mt-3 font-bold text-slate-700">
                  {search || riskFilter !== 'all'
                    ? 'Tiada murid sepadan penapis.'
                    : 'Tiada murid dalam skop ini.'}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {!search &&
                    riskFilter === 'all' &&
                    'Murid akan tersenarai selepas upload oleh pentadbir, atau pastikan kelas guru sepadan dengan kelas murid.'}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:grid">
                  <span className="col-span-4">Nama</span>
                  <span className="col-span-2">Refleksi</span>
                  <span className="col-span-1 text-right">Mata</span>
                  <span className="col-span-1 text-right">Streak</span>
                  <span className="col-span-4 text-right">Tindakan</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {filtered.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-3 px-4 py-3 transition hover:bg-slate-50/80 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2 sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:col-span-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-xs font-bold text-white">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/guru/murid/${s.id}`}
                            className="block truncate text-sm font-semibold text-slate-900 hover:text-primary-700 hover:underline"
                          >
                            {s.full_name}
                          </Link>
                          {s.class_name && (
                            <p className="truncate text-[11px] text-slate-400">{s.class_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        {s.last_checkin ? (
                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">
                              {s.last_score != null ? `${Math.round(s.last_score)}%` : '—'}
                            </span>
                            <span className="text-slate-400"> · {s.last_checkin.slice(5)}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Tiada refleksi</p>
                        )}
                      </div>

                      <span className="text-sm font-bold text-primary-700 sm:col-span-1 sm:text-right">
                        {s.total_points}
                      </span>
                      <span className="text-sm text-slate-500 sm:col-span-1 sm:text-right">
                        🔥 {s.streak}h
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5 sm:col-span-4 sm:justify-end">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${riskColor[s.risk]}`}
                        >
                          {riskLabel[s.risk]}
                        </span>
                        <button
                          type="button"
                          title="Tambah rekod"
                          onClick={() => {
                            setSelStudent(s.id)
                            setSaved(false)
                            setFormErr('')
                            document.getElementById('guru-rekod-form')?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'nearest',
                            })
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Plus size={12} /> Rekod
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRefStudent(s)
                            setRefMsg('')
                            setRefSaved(false)
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 transition hover:bg-cyan-100"
                        >
                          <Send size={12} /> Rujuk
                        </button>
                        <Link
                          href={`/guru/murid/${s.id}`}
                          className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 p-1 text-violet-700 transition hover:bg-violet-100"
                          title="Lihat profil"
                        >
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Taburan */}
          <div className="panel">
            <h2 className="mb-4 text-base font-bold text-slate-900">
              Taburan Mata — {classLabel}
            </h2>
            <div className="space-y-3">
              {taburan.map((t) => {
                const pct = total ? Math.round((t.count / total) * 100) : 0
                return (
                  <div key={t.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{t.label}</span>
                      <span className="font-bold text-slate-900">
                        {t.count} murid ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${t.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <section className="space-y-6">
          <div id="guru-rekod-form" className="panel !p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <GraduationCap size={18} className="text-violet-600" />
                Tambah Rekod
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Merit, catatan dalaman, atau kes disiplin
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-5">
              <select
                value={selStudent}
                onChange={(e) => setSelStudent(e.target.value)}
                className="input w-full"
              >
                <option value="">— Pilih murid —</option>
                {(canPickClass && classFilter !== 'all'
                  ? students.filter((s) => s.class_name === classFilter)
                  : students
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                    {s.class_name ? ` (${s.class_name})` : ''}
                  </option>
                ))}
              </select>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value)}
                className="input w-full"
              >
                <option value="merit">⭐ Merit (+5 mata)</option>
                <option value="teacher_note">📝 Catatan Guru (dalaman)</option>
                <option value="discipline_case">⚠️ Kes Disiplin (−5 mata)</option>
              </select>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="Hurai kejadian atau pencapaian..."
                className="input min-h-[88px] w-full resize-none"
              />
              {formErr && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {formErr}
                </p>
              )}
              {saved && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  ✓ Rekod disimpan!
                </p>
              )}
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Menyimpan...' : 'Simpan Rekod'}
              </button>
            </form>
          </div>

          <div className="panel !p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Aktiviti Terkini</h2>
            </div>
            {activities.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">
                Tiada rekod terkini untuk skop ini.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 px-5 py-3">
                    <span className="mt-0.5 text-base">
                      {a.record_type === 'merit'
                        ? '⭐'
                        : a.record_type === 'discipline_case'
                          ? '⚠️'
                          : '📝'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{a.full_name}</p>
                      <p className="text-[11px] font-medium text-slate-400">
                        {recordTypeLabel[a.record_type] || a.record_type}
                        {a.points ? ` · ${a.points > 0 ? '+' : ''}${a.points}` : ''}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500">{a.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{a.record_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <ModalOverlay
        open={refStudent !== null}
        onClose={() => setRefStudent(null)}
        title="Rujuk ke GBK"
        subtitle={refStudent ? `Murid: ${refStudent.full_name}` : undefined}
        size="md"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRefStudent(null)}
              className="btn-secondary flex-1"
              disabled={refSaving}
            >
              Batal
            </button>
            <button
              type="submit"
              form="guru-referral-form"
              className="btn-primary flex-1"
              disabled={refSaving || refSaved}
            >
              {refSaving ? 'Menghantar...' : 'Hantar Rujukan'}
            </button>
          </div>
        }
      >
        {refSaved ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            ✓ Rujukan dihantar ke Reach Out Inbox GBK.
          </p>
        ) : (
          <form id="guru-referral-form" onSubmit={handleReferralSubmit} className="space-y-4">
            <p className="text-sm text-neutral-600">
              Rujukan akan masuk inbox kaunselor. Terangkan isu / tingkah laku yang perlu
              intervensi.
            </p>
            <textarea
              value={refMsg}
              onChange={(e) => setRefMsg(e.target.value)}
              rows={4}
              required
              placeholder="Contoh: Murid kerap ponteng dan agresif di kelas. Mohon bimbingan."
              className="input min-h-[100px] w-full"
            />
          </form>
        )}
      </ModalOverlay>
    </PortalShell>
  )
}
