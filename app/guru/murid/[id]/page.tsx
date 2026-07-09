'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Flame,
  Send,
  Star,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { PortalShell } from '@/components/portal-shell'
import { ModalOverlay } from '@/components/modal-overlay'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type RiskLevel = 'hijau' | 'kuning' | 'jingga' | 'merah'

type StudentProfile = {
  id: string
  full_name: string
  class_name: string | null
  ic_or_student_id: string | null
}

type Checkin = {
  id: string
  checkin_date: string
  total_score: number | null
  discipline_score: number | null
  emotional_score: number | null
  q7_perasaan_emosi: string | null
  q10_perlukan_bantuan: string | null
}

type Behavior = {
  id: string
  record_type: string
  description: string | null
  points: number | null
  record_date: string
}

const riskStyle: Record<RiskLevel, { chip: string; label: string }> = {
  hijau: { chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200', label: 'Baik' },
  kuning: { chip: 'bg-yellow-100 text-yellow-800 ring-yellow-200', label: 'Perhatian' },
  jingga: { chip: 'bg-orange-100 text-orange-800 ring-orange-200', label: 'Amaran' },
  merah: { chip: 'bg-rose-100 text-rose-800 ring-rose-200', label: 'Kritikal' },
}

const typeIcon: Record<string, string> = {
  merit: '⭐',
  discipline_case: '⚠️',
  teacher_note: '📝',
  attendance: '📅',
  cocurricular: '🏆',
  self_reflection: '💭',
}

export default function GuruStudentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const studentId = params.id
  const { profile, loading: authLoading } = useAuth()

  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [risk, setRisk] = useState<{ level: RiskLevel; reason: string | null } | null>(null)
  const [points, setPoints] = useState({ total: 0, streak: 0, longest: 0 })
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // rekod modal
  const [showRecord, setShowRecord] = useState(false)
  const [recType, setRecType] = useState('merit')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  // rujuk GBK
  const [showRef, setShowRef] = useState(false)
  const [refMsg, setRefMsg] = useState('')
  const [refSaving, setRefSaving] = useState(false)
  const [refSaved, setRefSaved] = useState(false)

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
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.id, studentId])

  async function fetchAll() {
    setLoading(true)
    setError('')
    try {
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, class_name, ic_or_student_id')
        .eq('id', studentId)
        .eq('role', 'student')
        .maybeSingle()

      if (pErr) throw pErr
      if (!p) {
        setError('Murid tidak dijumpai.')
        setStudent(null)
        return
      }

      const sp = p as StudentProfile

      // Guru kelas hanya boleh buka murid dalam kelas sendiri
      if (
        profile?.role === 'class_teacher' &&
        profile.class_name &&
        sp.class_name !== profile.class_name
      ) {
        setError('Murid ini bukan dalam kelas anda.')
        setStudent(null)
        return
      }

      setStudent(sp)

      const [{ data: riskData }, { data: pt }, { data: ci }, { data: br }] = await Promise.all([
        supabase
          .from('risk_levels')
          .select('level, reason')
          .eq('student_id', studentId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('points_tracker')
          .select('total_points, current_streak, longest_streak')
          .eq('student_id', studentId)
          .maybeSingle(),
        supabase
          .from('checkins')
          .select(
            'id, checkin_date, total_score, discipline_score, emotional_score, q7_perasaan_emosi, q10_perlukan_bantuan'
          )
          .eq('student_id', studentId)
          .order('checkin_date', { ascending: true })
          .limit(30),
        supabase
          .from('behavior_records')
          .select('id, record_type, description, points, record_date')
          .eq('student_id', studentId)
          .order('record_date', { ascending: false })
          .limit(20),
      ])

      if (riskData) {
        setRisk({
          level: (riskData as { level: RiskLevel }).level,
          reason: (riskData as { reason: string | null }).reason,
        })
      } else {
        setRisk({ level: 'hijau', reason: null })
      }

      const pts = pt as {
        total_points: number
        current_streak: number
        longest_streak: number
      } | null
      setPoints({
        total: pts?.total_points ?? 0,
        streak: pts?.current_streak ?? 0,
        longest: pts?.longest_streak ?? 0,
      })
      setCheckins((ci as Checkin[]) || [])
      setBehaviors((br as Behavior[]) || [])
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Gagal muat data murid.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(
    () =>
      checkins.map((c) => ({
        date: c.checkin_date.slice(5),
        Emosi: c.emotional_score ?? null,
        Disiplin: c.discipline_score ?? null,
        Total: c.total_score ?? null,
      })),
    [checkins]
  )

  const recentHelp = checkins
    .slice()
    .reverse()
    .find((c) => c.q10_perlukan_bantuan === 'ya' || c.q10_perlukan_bantuan === 'mungkin')

  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    if (!desc.trim()) {
      setFormErr('Isikan keterangan.')
      return
    }
    setSaving(true)
    try {
      const pointsVal = recType === 'merit' ? 5 : recType === 'discipline_case' ? -5 : 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any).from('behavior_records').insert({
        student_id: studentId,
        record_type: recType,
        description: desc.trim(),
        points: pointsVal,
        recorded_by: profile?.id,
        record_date: new Date().toISOString().split('T')[0],
      })
      if (insErr) throw insErr
      setShowRecord(false)
      setDesc('')
      setRecType('merit')
      fetchAll()
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Gagal simpan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReferral(e: React.FormEvent) {
    e.preventDefault()
    if (!refMsg.trim()) return
    setRefSaving(true)
    setRefSaved(false)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any).from('reach_out_messages').insert({
        student_id: studentId,
        sender_id: profile?.id,
        message: refMsg.trim(),
        source: 'guru',
        status: 'baru',
      })
      if (insErr) throw insErr
      setRefSaved(true)
      setTimeout(() => {
        setShowRef(false)
        setRefMsg('')
        setRefSaved(false)
      }, 1200)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal hantar rujukan.')
    } finally {
      setRefSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Profil Murid" subtitle="Memuatkan...">
        <div className="flex justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </PortalShell>
    )
  }

  if (error || !student) {
    return (
      <PortalShell title="Profil Murid">
        <div className="panel text-center">
          <p className="font-semibold text-slate-800">{error || 'Murid tidak dijumpai.'}</p>
          <Link href="/guru" className="btn-primary mt-4 inline-flex">
            <ArrowLeft size={16} className="mr-2" /> Kembali ke Portal Guru
          </Link>
        </div>
      </PortalShell>
    )
  }

  const level = risk?.level ?? 'hijau'

  return (
    <PortalShell
      title={student.full_name}
      subtitle={[student.class_name, student.ic_or_student_id ? `ID ${student.ic_or_student_id}` : null]
        .filter(Boolean)
        .join(' · ')}
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/guru"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Kelas
        </Link>
        <button
          type="button"
          onClick={() => {
            setShowRecord(true)
            setFormErr('')
            setDesc('')
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
        >
          <Plus size={16} /> Tambah Rekod
        </button>
        <button
          type="button"
          onClick={() => {
            setShowRef(true)
            setRefMsg('')
            setRefSaved(false)
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
        >
          <Send size={16} /> Rujuk GBK
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="panel">
          <p className="text-xs font-semibold text-slate-500">Status Risiko</p>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ring-1 ${riskStyle[level].chip}`}
          >
            {riskStyle[level].label}
          </span>
          {risk?.reason && (
            <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{risk.reason}</p>
          )}
        </div>
        <div className="panel">
          <p className="text-xs font-semibold text-slate-500">Jumlah Mata</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-primary-800">
            <Star size={20} className="text-amber-500" /> {points.total}
          </p>
        </div>
        <div className="panel">
          <p className="text-xs font-semibold text-slate-500">Streak Refleksi</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-orange-700">
            <Flame size={20} /> {points.streak}h
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Terpanjang: {points.longest}h</p>
        </div>
        <div className="panel">
          <p className="text-xs font-semibold text-slate-500">Refleksi (30 rekod)</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{checkins.length}</p>
          {recentHelp && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
              <AlertTriangle size={12} /> Minta bantuan: {recentHelp.q10_perlukan_bantuan}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="panel lg:col-span-3">
          <h2 className="mb-4 text-base font-bold text-slate-900">Trend Refleksi</h2>
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Belum ada data refleksi.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="#3d6653"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Emosi"
                    stroke="#ef9220"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Disiplin"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent checkins list */}
        <div className="panel !p-0 overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Refleksi Terkini</h2>
          </div>
          {checkins.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Tiada rekod.</p>
          ) : (
            <div className="max-h-72 divide-y divide-slate-50 overflow-y-auto">
              {[...checkins].reverse().slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.checkin_date}</p>
                    <p className="text-[11px] text-slate-400">
                      {c.q7_perasaan_emosi || '—'}
                      {c.q10_perlukan_bantuan && c.q10_perlukan_bantuan !== 'tidak'
                        ? ` · bantuan: ${c.q10_perlukan_bantuan}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary-700">
                    {c.total_score != null ? `${Math.round(c.total_score)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Behavior history */}
        <div className="panel !p-0 overflow-hidden lg:col-span-5">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Rekod Tingkah Laku</h2>
            <p className="text-xs text-slate-500">
              Catatan guru bersifat dalaman — tidak dipapar kepada ibu bapa.
            </p>
          </div>
          {behaviors.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              Belum ada rekod. Guna butang &quot;Tambah Rekod&quot;.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {behaviors.map((b) => (
                <div key={b.id} className="flex gap-3 px-5 py-3">
                  <span className="text-lg">{typeIcon[b.record_type] || '📌'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {b.record_type === 'merit'
                          ? 'Merit'
                          : b.record_type === 'discipline_case'
                            ? 'Kes Disiplin'
                            : b.record_type === 'teacher_note'
                              ? 'Catatan Guru'
                              : b.record_type}
                      </p>
                      {b.points != null && b.points !== 0 && (
                        <span
                          className={`text-xs font-bold ${b.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {b.points > 0 ? '+' : ''}
                          {b.points}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">{b.record_date}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal rekod */}
      <ModalOverlay
        open={showRecord}
        onClose={() => setShowRecord(false)}
        title="Tambah Rekod"
        subtitle={student.full_name}
        size="md"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowRecord(false)}>
              Batal
            </button>
            <button type="submit" form="guru-detail-record" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <form id="guru-detail-record" onSubmit={handleSaveRecord} className="space-y-3">
          <select value={recType} onChange={(e) => setRecType(e.target.value)} className="input w-full">
            <option value="merit">⭐ Merit (+5)</option>
            <option value="teacher_note">📝 Catatan Guru</option>
            <option value="discipline_case">⚠️ Kes Disiplin (−5)</option>
          </select>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            required
            placeholder="Keterangan rekod..."
            className="input min-h-[100px] w-full"
          />
          {formErr && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formErr}
            </p>
          )}
        </form>
      </ModalOverlay>

      {/* Modal rujuk */}
      <ModalOverlay
        open={showRef}
        onClose={() => setShowRef(false)}
        title="Rujuk ke GBK"
        subtitle={student.full_name}
        size="md"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowRef(false)} disabled={refSaving}>
              Batal
            </button>
            <button type="submit" form="guru-detail-ref" className="btn-primary flex-1" disabled={refSaving || refSaved}>
              {refSaving ? 'Menghantar...' : 'Hantar'}
            </button>
          </div>
        }
      >
        {refSaved ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            ✓ Rujukan dihantar ke inbox GBK.
          </p>
        ) : (
          <form id="guru-detail-ref" onSubmit={handleReferral} className="space-y-3">
            <p className="text-sm text-slate-600">
              Mesej ini masuk Reach Out Inbox kaunselor (bukan rekod intervensi rasmi).
            </p>
            <textarea
              value={refMsg}
              onChange={(e) => setRefMsg(e.target.value)}
              rows={4}
              required
              placeholder="Terangkan sebab rujukan..."
              className="input min-h-[100px] w-full"
            />
          </form>
        )}
      </ModalOverlay>
    </PortalShell>
  )
}
