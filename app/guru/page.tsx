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
  CalendarX,
  ClipboardList,
  Heart,
  Info,
} from 'lucide-react'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { ModalOverlay } from '@/components/modal-overlay'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type RiskLevel = 'hijau' | 'kuning' | 'jingga' | 'merah'
type QuickFilter = 'all' | 'risk' | 'no_checkin' | 'demerit' | 'need_help'
type RecKind = 'merit' | 'teacher_note' | 'discipline_case' | 'cocurricular'
type Severity = 'ringan' | 'sederhana' | 'serius'

type StudentRow = {
  id: string
  full_name: string
  class_name: string | null
  total_points: number
  streak: number
  risk: RiskLevel
  last_checkin: string | null
  last_score: number | null
  need_help: boolean
  demerit_week: number
  days_since_checkin: number | null
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

const severityPoints: Record<Severity, number> = {
  ringan: -3,
  sederhana: -5,
  serius: -10,
}

function daysBetween(isoDate: string | null): number | null {
  if (!isoDate) return null
  const d = new Date(isoDate + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - d.getTime()) / 86400000)
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
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'risk' | 'checkin'>('name')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  // rekod form
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [selStudent, setSelStudent] = useState('')
  const [recType, setRecType] = useState<RecKind>('merit')
  const [severity, setSeverity] = useState<Severity>('sederhana')
  const [desc, setDesc] = useState('')
  const [notifyGbk, setNotifyGbk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [saveNote, setSaveNote] = useState('')

  // referral modal
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
    if (profile.role === 'class_teacher' && profile.class_name) {
      setClassFilter(profile.class_name)
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.id])

  // Auto-check notify when discipline serius
  useEffect(() => {
    if (recType === 'discipline_case' && severity === 'serius') {
      setNotifyGbk(true)
    }
  }, [recType, severity])

  async function fetchAll() {
    setLoading(true)
    setFetchError('')
    try {
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

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekStr = weekAgo.toISOString().split('T')[0]
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const monthStr = monthAgo.toISOString().split('T')[0]

      const [pointsRes, riskRes, checkinRes, demeritRes, actRes] = await Promise.all([
        ids.length
          ? supabase
              .from('points_tracker')
              .select('student_id, total_points, current_streak')
              .in('student_id', ids)
          : Promise.resolve({ data: [] }),
        ids.length
          ? supabase
              .from('risk_levels')
              .select('student_id, level')
              .eq('is_active', true)
              .in('student_id', ids)
          : Promise.resolve({ data: [], error: null }),
        ids.length
          ? supabase
              .from('checkins')
              .select('student_id, checkin_date, total_score, q10_perlukan_bantuan')
              .in('student_id', ids)
              .gte('checkin_date', monthStr)
              .order('checkin_date', { ascending: false })
          : Promise.resolve({ data: [] }),
        ids.length
          ? supabase
              .from('behavior_records')
              .select('student_id, points')
              .in('student_id', ids)
              .eq('record_type', 'discipline_case')
              .gte('record_date', weekStr)
          : Promise.resolve({ data: [] }),
        ids.length
          ? supabase
              .from('behavior_records')
              .select('id, student_id, record_type, description, record_date, points')
              .in('student_id', ids)
              .order('record_date', { ascending: false })
              .limit(15)
          : Promise.resolve({ data: [] }),
      ])

      if ((riskRes as { error?: { message: string } }).error) {
        console.warn('risk_levels:', (riskRes as { error: { message: string } }).error.message)
      }

      const pointsMap: Record<string, { total_points: number; current_streak: number }> = {}
      for (const p of (pointsRes.data || []) as {
        student_id: string
        total_points: number
        current_streak: number
      }[]) {
        pointsMap[p.student_id] = p
      }

      const riskMap: Record<string, RiskLevel> = {}
      for (const r of (riskRes.data || []) as { student_id: string; level: RiskLevel }[]) {
        riskMap[r.student_id] = r.level
      }

      const lastCheckinMap: Record<
        string,
        { date: string; score: number | null; need_help: boolean }
      > = {}
      for (const c of (checkinRes.data || []) as {
        student_id: string
        checkin_date: string
        total_score: number | null
        q10_perlukan_bantuan: string | null
      }[]) {
        if (!lastCheckinMap[c.student_id]) {
          lastCheckinMap[c.student_id] = {
            date: c.checkin_date,
            score: c.total_score,
            need_help: c.q10_perlukan_bantuan === 'ya' || c.q10_perlukan_bantuan === 'mungkin',
          }
        } else if (
          c.q10_perlukan_bantuan === 'ya' ||
          c.q10_perlukan_bantuan === 'mungkin'
        ) {
          // any recent need_help in 30d on latest is already set; mark if last said help
        }
      }
      // Also flag if ANY checkin in last 7 days asked for help
      const needHelpMap: Record<string, boolean> = {}
      for (const c of (checkinRes.data || []) as {
        student_id: string
        checkin_date: string
        q10_perlukan_bantuan: string | null
      }[]) {
        if (c.checkin_date >= weekStr && (c.q10_perlukan_bantuan === 'ya' || c.q10_perlukan_bantuan === 'mungkin')) {
          needHelpMap[c.student_id] = true
        }
      }

      const demeritMap: Record<string, number> = {}
      for (const d of (demeritRes.data || []) as { student_id: string; points: number | null }[]) {
        demeritMap[d.student_id] = (demeritMap[d.student_id] || 0) + 1
      }

      setStudents(
        studentList.map((s) => {
          const last = lastCheckinMap[s.id]
          return {
            id: s.id,
            full_name: s.full_name,
            class_name: s.class_name,
            total_points: pointsMap[s.id]?.total_points ?? 0,
            streak: pointsMap[s.id]?.current_streak ?? 0,
            risk: riskMap[s.id] ?? 'hijau',
            last_checkin: last?.date ?? null,
            last_score: last?.score ?? null,
            need_help: !!needHelpMap[s.id],
            demerit_week: demeritMap[s.id] || 0,
            days_since_checkin: daysBetween(last?.date ?? null),
          }
        })
      )

      const actData = (actRes.data || []) as {
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

  function openRecordFor(studentId?: string, kind: RecKind = 'merit') {
    setSelStudent(studentId || '')
    setRecType(kind)
    setSeverity('sederhana')
    setDesc('')
    setNotifyGbk(kind === 'discipline_case')
    setSaved(false)
    setFormErr('')
    setSaveNote('')
    setShowRecordModal(true)
  }

  async function handleSubmitRecord(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    setSaved(false)
    setSaveNote('')
    if (!selStudent) {
      setFormErr('Pilih murid.')
      return
    }
    if (!desc.trim()) {
      setFormErr('Isikan keterangan kejadian / pencapaian.')
      return
    }
    setSaving(true)
    try {
      let points = 0
      if (recType === 'merit') points = 5
      else if (recType === 'cocurricular') points = 3
      else if (recType === 'discipline_case') points = severityPoints[severity]

      const prefix =
        recType === 'discipline_case'
          ? `[Disiplin ${severity}] `
          : recType === 'cocurricular'
            ? '[Kokurikulum] '
            : ''
      const description = `${prefix}${desc.trim()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('behavior_records').insert({
        student_id: selStudent,
        record_type: recType,
        description,
        points,
        recorded_by: profile?.id,
        record_date: new Date().toISOString().split('T')[0],
      })
      if (error) throw error

      let gbkOk = false
      if (notifyGbk) {
        const stu = students.find((s) => s.id === selStudent)
        const gbkMsg =
          recType === 'discipline_case'
            ? `Rujukan disiplin (${severity}) daripada guru ${profile?.full_name || ''}.\nMurid: ${stu?.full_name || ''}\n\n${desc.trim()}`
            : `Rujukan daripada guru ${profile?.full_name || ''}.\nMurid: ${stu?.full_name || ''}\n\n${desc.trim()}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rErr } = await (supabase as any).from('reach_out_messages').insert({
          student_id: selStudent,
          sender_id: profile?.id,
          message: gbkMsg,
          source: 'guru',
          status: 'baru',
        })
        if (rErr) throw new Error(`Rekod disimpan, tapi rujuk GBK gagal: ${rErr.message}`)
        gbkOk = true
      }

      setSaved(true)
      setSaveNote(
        gbkOk
          ? 'Rekod disimpan + dihantar ke inbox GBK.'
          : 'Rekod disimpan (log kelas / mata sahaja).'
      )
      setDesc('')
      fetchAll()
      setTimeout(() => {
        setShowRecordModal(false)
        setSaved(false)
        setSaveNote('')
      }, 1400)
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
      // Also log as teacher_note for class history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('behavior_records').insert({
        student_id: refStudent.id,
        record_type: 'teacher_note',
        description: `[Rujuk GBK] ${refMsg.trim()}`,
        points: 0,
        recorded_by: profile?.id,
        record_date: new Date().toISOString().split('T')[0],
      })

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
      fetchAll()
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

  const scopedBase = useMemo(() => {
    if (canPickClass && classFilter !== 'all') {
      return students.filter((s) => s.class_name === classFilter)
    }
    return students
  }, [students, canPickClass, classFilter])

  const filtered = useMemo(() => {
    let list = [...scopedBase]

    if (quickFilter === 'risk') {
      list = list.filter((s) => s.risk === 'jingga' || s.risk === 'merah' || s.risk === 'kuning')
    } else if (quickFilter === 'no_checkin') {
      list = list.filter((s) => s.days_since_checkin === null || s.days_since_checkin > 7)
    } else if (quickFilter === 'demerit') {
      list = list.filter((s) => s.demerit_week > 0)
    } else if (quickFilter === 'need_help') {
      list = list.filter((s) => s.need_help)
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
      if (sortBy === 'checkin') {
        const da = a.days_since_checkin ?? 999
        const db = b.days_since_checkin ?? 999
        return db - da
      }
      return a.full_name.localeCompare(b.full_name, 'ms')
    })

    return list
  }, [scopedBase, quickFilter, riskFilter, search, sortBy])

  const total = scopedBase.length
  const amaran = scopedBase.filter((s) => s.risk === 'jingga' || s.risk === 'merah').length
  const cemerlang = scopedBase.filter((s) => s.total_points >= 800).length
  const avgPts = total
    ? Math.round(scopedBase.reduce((a, s) => a + s.total_points, 0) / total)
    : 0
  const noCheckin7d = scopedBase.filter(
    (s) => s.days_since_checkin === null || s.days_since_checkin > 7
  ).length
  const demeritWeek = scopedBase.filter((s) => s.demerit_week > 0).length
  const needHelpN = scopedBase.filter((s) => s.need_help).length

  const actionList = useMemo(() => {
    return scopedBase
      .filter(
        (s) =>
          s.risk === 'merah' ||
          s.risk === 'jingga' ||
          s.need_help ||
          s.demerit_week > 0 ||
          s.days_since_checkin === null ||
          (s.days_since_checkin !== null && s.days_since_checkin > 7)
      )
      .sort((a, b) => riskRank[a.risk] - riskRank[b.risk])
      .slice(0, 8)
  }, [scopedBase])

  const taburan = [
    { label: 'Cemerlang', min: 800, max: Infinity, color: 'bg-emerald-500' },
    { label: 'Baik', min: 600, max: 799, color: 'bg-blue-500' },
    { label: 'Sederhana', min: 400, max: 599, color: 'bg-yellow-400' },
    { label: 'Perlu Bimbingan', min: 0, max: 399, color: 'bg-rose-500' },
  ].map((t) => ({
    ...t,
    count: scopedBase.filter((s) => s.total_points >= t.min && s.total_points <= t.max).length,
  }))

  const classLabel =
    isClassTeacher && myClass
      ? myClass
      : classFilter !== 'all'
        ? classFilter
        : canPickClass
          ? 'Semua Kelas'
          : myClass || 'Kelas'

  const studentOptions =
    canPickClass && classFilter !== 'all'
      ? students.filter((s) => s.class_name === classFilter)
      : students

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
      subtitle={`${total} murid · rekod kelas, disiplin, pantau refleksi & rujuk GBK`}
    >
      {isClassTeacher && !myClass && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Profil guru belum ada kelas. Hubungi pentadbir untuk tetapkan kelas.
        </div>
      )}

      {fetchError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {fetchError}
        </div>
      )}

      {/* Quick action bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => openRecordFor('', 'merit')} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={16} /> Tambah rekod
        </button>
        <button
          type="button"
          onClick={() => openRecordFor('', 'discipline_case')}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
        >
          <ClipboardList size={16} /> Rekod disiplin
        </button>
        <p className="text-xs text-slate-500 sm:ml-2">
          Disiplin = jejak + potong mata. Tanda “Maklumkan GBK” untuk hantar ke kaunselor.
        </p>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatCard label="Murid" value={total} icon={<Users size={20} />} tone="blue" subtitle={classLabel} />
        <StatCard label="Purata mata" value={avgPts} icon={<Star size={20} />} tone="purple" />
        <StatCard label="Cemerlang" value={cemerlang} icon={<Trophy size={20} />} tone="green" subtitle="≥800" />
        <StatCard
          label="Risiko tinggi"
          value={amaran}
          icon={<AlertTriangle size={20} />}
          tone="red"
          subtitle="Jingga/merah"
          onClick={() => setQuickFilter('risk')}
        />
        <StatCard
          label="Tiada refleksi"
          value={noCheckin7d}
          icon={<CalendarX size={20} />}
          tone="orange"
          subtitle="≥7 hari"
          onClick={() => setQuickFilter('no_checkin')}
        />
      </div>

      {/* Perlu tindakan */}
      {actionList.length > 0 && (
        <div className="mb-6 panel !p-0 overflow-hidden border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold text-slate-900">Perlu perhatian kelas</h2>
            <span className="text-xs text-slate-500">{actionList.length} dipapar</span>
          </div>
          <div className="divide-y divide-slate-50">
            {actionList.map((s) => {
              const reasons: string[] = []
              if (s.risk === 'merah' || s.risk === 'jingga') reasons.push(`Risiko ${riskLabel[s.risk]}`)
              if (s.need_help) reasons.push('Minta bantuan (refleksi)')
              if (s.demerit_week > 0) reasons.push(`${s.demerit_week} disiplin /7h`)
              if (s.days_since_checkin === null) reasons.push('Belum pernah refleksi')
              else if (s.days_since_checkin > 7) reasons.push(`Refleksi ${s.days_since_checkin}h lepas`)
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/guru/murid/${s.id}`} className="text-sm font-bold text-slate-900 hover:text-primary-700 hover:underline">
                      {s.full_name}
                    </Link>
                    <p className="text-[11px] text-slate-500">{reasons.join(' · ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRecordFor(s.id, 'discipline_case')}
                    className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800"
                  >
                    Disiplin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRefStudent(s)
                      setRefMsg('')
                      setRefSaved(false)
                    }}
                    className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800"
                  >
                    Rujuk GBK
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="panel overflow-hidden !p-0">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Senarai murid</h2>
                    <p className="text-xs text-slate-500">{filtered.length} dipapar</p>
                  </div>
                  <div className="relative sm:w-56">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      placeholder="Cari nama..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input w-full pl-9"
                    />
                  </div>
                </div>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'all' as const, label: 'Semua', n: scopedBase.length },
                      { id: 'risk' as const, label: 'Risiko', n: amaran + scopedBase.filter((s) => s.risk === 'kuning').length },
                      { id: 'no_checkin' as const, label: 'Tiada refleksi', n: noCheckin7d },
                      { id: 'demerit' as const, label: 'Disiplin 7h', n: demeritWeek },
                      { id: 'need_help' as const, label: 'Minta bantuan', n: needHelpN },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setQuickFilter(c.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ring-1 ${
                        quickFilter === c.id
                          ? 'bg-violet-700 text-white ring-violet-700'
                          : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {c.label} ({c.n})
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  {canPickClass && (
                    <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input !w-auto !py-1.5 text-xs">
                      <option value="all">Semua kelas</option>
                      {allClasses.map((c) => (
                        <option key={c} value={c}>{c}</option>
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
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="input !w-auto !py-1.5 text-xs"
                  >
                    <option value="name">Susun: Nama</option>
                    <option value="points">Susun: Mata</option>
                    <option value="risk">Susun: Risiko</option>
                    <option value="checkin">Susun: Lama tiada refleksi</option>
                  </select>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl">🏫</p>
                <p className="mt-3 font-bold text-slate-700">Tiada murid sepadan penapis.</p>
              </div>
            ) : (
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
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {s.need_help && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700">
                              <Heart size={10} /> Bantuan
                            </span>
                          )}
                          {s.demerit_week > 0 && (
                            <span className="rounded bg-orange-50 px-1.5 text-[10px] font-bold text-orange-800">
                              {s.demerit_week} disiplin
                            </span>
                          )}
                          {(s.days_since_checkin === null || s.days_since_checkin > 7) && (
                            <span className="rounded bg-amber-50 px-1.5 text-[10px] font-bold text-amber-800">
                              Tiada refleksi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      {s.last_checkin ? (
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {s.last_score != null ? `${Math.round(s.last_score)}%` : '—'}
                          </span>
                          <span className="text-slate-400">
                            {' '}
                            · {s.days_since_checkin === 0 ? 'hari ini' : `${s.days_since_checkin}h lepas`}
                          </span>
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
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${riskColor[s.risk]}`}>
                        {riskLabel[s.risk]}
                      </span>
                      <button
                        type="button"
                        onClick={() => openRecordFor(s.id, 'merit')}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Plus size={12} /> Rekod
                      </button>
                      <button
                        type="button"
                        onClick={() => openRecordFor(s.id, 'discipline_case')}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100"
                      >
                        Disiplin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefStudent(s)
                          setRefMsg('')
                          setRefSaved(false)
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 hover:bg-cyan-100"
                      >
                        <Send size={12} /> GBK
                      </button>
                      <Link
                        href={`/guru/murid/${s.id}`}
                        className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 p-1 text-violet-700 hover:bg-violet-100"
                        title="Profil"
                      >
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="mb-4 text-base font-bold text-slate-900">Taburan mata — {classLabel}</h2>
            <div className="space-y-3">
              {taburan.map((t) => {
                const pct = total ? Math.round((t.count / total) * 100) : 0
                return (
                  <div key={t.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{t.label}</span>
                      <span className="font-bold text-slate-900">
                        {t.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-2.5 rounded-full ${t.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="panel border border-violet-100 bg-violet-50/40">
            <div className="mb-2 flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-violet-700" />
              <div className="text-xs leading-relaxed text-violet-900">
                <p className="font-bold">Apakah rekod disiplin?</p>
                <p className="mt-1">
                  Jejak salah laku + potong mata untuk pantau kelas. Bukan fail GBK.
                  Tanda <b>Maklumkan GBK</b> jika perlu kaunselor campur tangan.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => openRecordFor('', 'discipline_case')} className="btn-primary mt-2 w-full text-sm">
              Buka form rekod
            </button>
          </div>

          <div className="panel !p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <GraduationCap size={18} className="text-violet-600" />
                Aktiviti terkini
              </h2>
            </div>
            {activities.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">Tiada rekod lagi. Mula dengan merit atau disiplin.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 px-5 py-3">
                    <span className="mt-0.5 text-base">
                      {a.record_type === 'merit'
                        ? '⭐'
                        : a.record_type === 'discipline_case'
                          ? '⚠️'
                          : a.record_type === 'cocurricular'
                            ? '🏆'
                            : '📝'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{a.full_name}</p>
                      <p className="text-[11px] font-medium text-slate-400">
                        {recordTypeLabel[a.record_type] || a.record_type}
                        {a.points ? ` · ${a.points > 0 ? '+' : ''}${a.points}` : ''}
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-500">{a.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{a.record_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal rekod */}
      <ModalOverlay
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title="Tambah rekod murid"
        subtitle="Merit · catatan · disiplin · kokurikulum"
        size="lg"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowRecordModal(false)} disabled={saving}>
              Tutup
            </button>
            <button type="submit" form="guru-record-form" className="btn-primary flex-1" disabled={saving || saved}>
              {saving ? 'Menyimpan...' : 'Simpan rekod'}
            </button>
          </div>
        }
      >
        {saved ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            ✓ {saveNote || 'Rekod disimpan!'}
          </p>
        ) : (
          <form id="guru-record-form" onSubmit={handleSubmitRecord} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Murid</label>
              <select value={selStudent} onChange={(e) => setSelStudent(e.target.value)} className="input w-full" required>
                <option value="">— Pilih murid —</option>
                {studentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                    {s.class_name ? ` (${s.class_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Jenis rekod</label>
              <select
                value={recType}
                onChange={(e) => {
                  const v = e.target.value as RecKind
                  setRecType(v)
                  setNotifyGbk(v === 'discipline_case' && severity === 'serius')
                }}
                className="input w-full"
              >
                <option value="merit">⭐ Merit (+5) — pujian / ganjaran</option>
                <option value="cocurricular">🏆 Kokurikulum (+3)</option>
                <option value="teacher_note">📝 Catatan guru (dalaman, ibu bapa tak nampak)</option>
                <option value="discipline_case">⚠️ Kes disiplin (potong mata + jejak)</option>
              </select>
            </div>

            {recType === 'discipline_case' && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Tahap keseriusan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'ringan' as const, label: 'Ringan', pts: '−3' },
                      { id: 'sederhana' as const, label: 'Sederhana', pts: '−5' },
                      { id: 'serius' as const, label: 'Serius', pts: '−10' },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSeverity(o.id)}
                      className={`rounded-xl border px-2 py-2 text-center text-xs font-bold transition ${
                        severity === o.id
                          ? 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {o.label}
                      <span className="mt-0.5 block text-[10px] font-semibold opacity-70">{o.pts} mata</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Keterangan</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                required
                placeholder={
                  recType === 'discipline_case'
                    ? 'Contoh: Ponteng kelas BM, ditegur 2x. Tarikh & saksi...'
                    : recType === 'merit'
                      ? 'Contoh: Menolong rakan membersihkan kelas tanpa diminta.'
                      : 'Hurai catatan...'
                }
                className="input min-h-[100px] w-full"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
              <input
                type="checkbox"
                checked={notifyGbk}
                onChange={(e) => setNotifyGbk(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-700"
              />
              <span className="text-sm text-slate-700">
                <span className="font-bold text-cyan-900">Maklumkan GBK (Reach Out)</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Hantar salinan ke inbox kaunselor. Disyorkan untuk kes serius / perlu bimbingan.
                  Rekod kelas tetap disimpan sama ada ditanda atau tidak.
                </span>
              </span>
            </label>

            {formErr && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{formErr}</p>
            )}
          </form>
        )}
      </ModalOverlay>

      {/* Modal rujuk GBK */}
      <ModalOverlay
        open={refStudent !== null}
        onClose={() => setRefStudent(null)}
        title="Rujuk ke GBK"
        subtitle={refStudent ? `Murid: ${refStudent.full_name}` : undefined}
        size="md"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setRefStudent(null)} className="btn-secondary flex-1" disabled={refSaving}>
              Batal
            </button>
            <button type="submit" form="guru-referral-form" className="btn-primary flex-1" disabled={refSaving || refSaved}>
              {refSaving ? 'Menghantar...' : 'Hantar rujukan'}
            </button>
          </div>
        }
      >
        {refSaved ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            ✓ Rujukan dihantar ke inbox GBK + dicatat dalam rekod kelas.
          </p>
        ) : (
          <form id="guru-referral-form" onSubmit={handleReferralSubmit} className="space-y-4">
            <p className="text-sm text-neutral-600">
              Untuk isu emosi, tingkah laku berulang, atau perlukan kaunseling. GBK akan nampak di{' '}
              <b>Reach Out Inbox</b>.
            </p>
            <textarea
              value={refMsg}
              onChange={(e) => setRefMsg(e.target.value)}
              rows={4}
              required
              placeholder="Contoh: Murid kerap menangis di kelas, rakan laporkan diganggu. Mohon sesi kaunseling."
              className="input min-h-[100px] w-full"
            />
          </form>
        )}
      </ModalOverlay>
    </PortalShell>
  )
}
