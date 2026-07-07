'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  avgDisciplineByMonth,
  attendancePctFromCheckins,
  behaviorPie,
  demeritCount,
  formatLastUpdate,
  labelBaik,
  refleksiCalendarDays,
  starsFromPct,
} from '@/lib/parent-dashboard'
import {
  BarChart2,
  Bell,
  Calendar,
  Heart,
  Star,
  Trophy,
  User,
  BookOpen,
  MessageCircle,
  Shield,
  Smartphone,
  UserPlus,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { ms } from 'date-fns/locale'

type ChildRow = { id: string; full_name: string; class_name: string | null; ic_number: string | null }
type CheckinRow = {
  id: string
  checkin_date: string
  discipline_score: number | null
  emotional_score: number | null
  q1_kehadiran_ketepatan: number | null
  q7_perasaan_emosi: string | null
  q9_tahap_stres: number | null
}
type BehaviorRow = { record_type: string; points: number | null; record_date: string; description: string | null }
type CounselRow = { id: string; session_date: string; status: string; purpose: string | null }
type ParentNoteRow = {
  id: string
  session_date: string
  parent_note: string | null
}
type BadgeRow = { id: string; badge_name: string; icon: string | null }
type PointsRow = { total_points: number; current_streak: number }

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
      ))}
    </span>
  )
}

export default function IbuBapaPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [behavior, setBehavior] = useState<BehaviorRow[]>([])
  const [sessions, setSessions] = useState<CounselRow[]>([])
  const [parentNotes, setParentNotes] = useState<ParentNoteRow[]>([])
  const [points, setPoints] = useState<PointsRow | null>(null)
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [parentReachOut, setParentReachOut] = useState('')
  const [sendingReachOut, setSendingReachOut] = useState(false)
  const [linkIc, setLinkIc] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkMessage, setLinkMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function normalizeIcInput(raw: string) {
    return raw.replace(/\D/g, '').slice(0, 12)
  }

  async function linkChildByIc() {
    if (profile?.role !== 'parent') {
      setLinkMessage({ type: 'err', text: 'Hanya akaun ibu bapa boleh tambah anak di sini.' })
      return
    }
    const ic = normalizeIcInput(linkIc)
    if (ic.length !== 12) {
      setLinkMessage({ type: 'err', text: 'Masukkan No. IC murid 12 digit.' })
      return
    }
    setLinking(true)
    setLinkMessage(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('link_child_to_parent_by_ic', { child_ic: ic })
      if (error) throw error
      const result = data as {
        ok?: boolean
        error?: string
        child_id?: string
        full_name?: string
        already_linked?: boolean
      }
      if (!result?.ok) {
        setLinkMessage({ type: 'err', text: result?.error || 'Gagal paut anak.' })
        return
      }
      setLinkMessage({
        type: 'ok',
        text: result.already_linked
          ? `${result.full_name} sudah dipautkan.`
          : `Berjaya paut ${result.full_name}.`,
      })
      setLinkIc('')
      await fetchChildren()
      if (result.child_id) setSelectedChildId(result.child_id)
    } catch (e) {
      console.error(e)
      setLinkMessage({
        type: 'err',
        text: 'Gagal paut. Pastikan migration 015 dah apply di Supabase.',
      })
    } finally {
      setLinking(false)
    }
  }

  const addChildPanel = (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus size={20} className="text-cyan-700" />
        <h2 className="text-sm font-black text-slate-900">Tambah anak (No. IC)</h2>
      </div>
      <p className="mb-3 text-xs text-slate-600">
        Masukkan No. Kad Pengenalan murid (12 digit). Boleh tambah lebih daripada seorang — pilih anak di bawah untuk lihat dashboard masing-masing.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          inputMode="numeric"
          value={linkIc}
          onChange={(e) => setLinkIc(normalizeIcInput(e.target.value))}
          placeholder="Contoh: 080821011034"
          className="input font-mono text-sm tracking-wide"
          maxLength={12}
          disabled={linking || profile?.role !== 'parent'}
        />
        <button
          type="button"
          onClick={linkChildByIc}
          disabled={linking || linkIc.length !== 12 || profile?.role !== 'parent'}
          className="btn-primary shrink-0 px-6"
        >
          {linking ? 'Memproses...' : 'Paut anak'}
        </button>
      </div>
      {linkMessage && (
        <p
          className={`mt-2 text-xs font-semibold ${linkMessage.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}
        >
          {linkMessage.text}
        </p>
      )}
    </div>
  )

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
    fetchChildren()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchChildren() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, class_name, ic_number')
      .eq('parent_id', profile!.id)
      .order('full_name')
    const rows = (data || []) as ChildRow[]
    setChildren(rows)
    if (rows.length > 0) setSelectedChildId(rows[0].id)
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedChildId) {
      setCheckins([])
      setBehavior([])
      setSessions([])
      setParentNotes([])
      setPoints(null)
      setBadges([])
      return
    }
    fetchChildData(selectedChildId)
  }, [selectedChildId])

  async function fetchChildData(id: string) {
    const since = new Date()
    since.setDate(since.getDate() - 150)
    const sinceStr = since.toISOString().split('T')[0]
    const behSince = new Date()
    behSince.setDate(behSince.getDate() - 35)
    const behStr = behSince.toISOString().split('T')[0]

    const [ciRes, behRes, sessRes, noteRes, ptRes, bdRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('checkins')
        .select(
          'id,checkin_date,discipline_score,emotional_score,q1_kehadiran_ketepatan,q7_perasaan_emosi,q9_tahap_stres'
        )
        .eq('student_id', id)
        .gte('checkin_date', sinceStr)
        .order('checkin_date', { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('behavior_records')
        .select('record_type,points,record_date,description')
        .eq('student_id', id)
        .gte('record_date', behStr),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('counseling_sessions')
        .select('id,session_date,status,purpose')
        .eq('student_id', id)
        .order('session_date', { ascending: false })
        .limit(20),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('intervention_records')
        .select('id,session_date,parent_note')
        .eq('student_id', id)
        .eq('share_with_parent', true)
        .order('session_date', { ascending: false })
        .limit(5),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('points_tracker').select('total_points,current_streak').eq('student_id', id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('student_badges').select('id,badge_name,icon').eq('student_id', id).limit(8),
    ])

    setCheckins((ciRes.data || []) as CheckinRow[])
    setBehavior((behRes.data || []) as BehaviorRow[])
    setSessions((sessRes.data || []) as CounselRow[])
    setParentNotes((noteRes.data || []) as ParentNoteRow[])
    setPoints(ptRes.data as PointsRow | null)
    setBadges((bdRes.data || []) as BadgeRow[])
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)
  const latestDisc = Math.round(checkins[0]?.discipline_score ?? 0)
  const latestEmo = Math.round(checkins[0]?.emotional_score ?? 0)
  const attendancePct = attendancePctFromCheckins(checkins.slice(0, 30))
  const demerits = demeritCount(behavior)
  const sessionDone = sessions.filter((s) => s.status === 'selesai').length

  const monthTrend = useMemo(() => avgDisciplineByMonth(checkins, 5), [checkins])
  const pieData = useMemo(() => behaviorPie(behavior), [behavior])
  const checkinDateSet = useMemo(() => new Set(checkins.map((c) => c.checkin_date)), [checkins])
  const calDays = useMemo(
    () => refleksiCalendarDays(new Date(), checkinDateSet),
    [checkinDateSet]
  )

  const parentFirst = profile?.full_name?.split(' ')[0] || 'Ibu/Bapa'

  if (authLoading || loading) {
    return (
      <PortalShell title="Portal Ibu Bapa">
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      </PortalShell>
    )
  }

  if (children.length === 0) {
    return (
      <PortalShell title="Portal Ibu Bapa">
        <div className="mx-auto max-w-lg space-y-6 py-12">
          <div className="text-center">
            <p className="text-5xl">👪</p>
            <h2 className="mt-4 text-xl font-black text-slate-900">Paut anak anda</h2>
            <p className="mt-2 text-sm text-slate-500">Tiada anak dipautkan lagi. Gunakan No. IC murid di bawah.</p>
          </div>
          {addChildPanel}
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Portal Ibu Bapa" subtitle="Pemantauan Rekod Perkembangan Murid — data daripada refleksi & rekod sekolah">
      {/* Header mockup-style */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-lg font-bold text-slate-900">
            Selamat datang, {parentFirst} 👋
          </p>
          <p className="text-xs text-slate-500">
            Kemaskini terakhir: {formatLastUpdate(checkins[0]?.checkin_date)}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-600">
          <Bell size={18} />
          <span className="text-xs font-semibold">Notifikasi sekolah (akan datang)</span>
        </div>
      </div>

      <div className="mb-6">{addChildPanel}</div>

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pilih anak untuk paparan</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {children.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSelectedChildId(ch.id)}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                selectedChildId === ch.id
                  ? 'border-cyan-600 bg-cyan-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {ch.full_name}
              {ch.class_name ? ` · ${ch.class_name}` : ''}
            </button>
          ))}
        </div>
      </div>

      {selectedChild && (
        <>
          {/* Profil murid */}
          <div className="mb-6 panel flex flex-col gap-4 border-l-4 border-l-indigo-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
                {selectedChild.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-black uppercase tracking-tight text-slate-900">{selectedChild.full_name}</p>
                <p className="text-sm text-slate-600">{selectedChild.class_name || 'Kelas belum ditetapkan'}</p>
                {selectedChild.ic_number && (
                  <p className="mt-1 text-xs text-slate-500">No. IC Murid: {selectedChild.ic_number}</p>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-black text-indigo-600">{latestDisc || '—'}%</p>
                <p className="text-xs font-semibold text-slate-500">Disiplin</p>
                {latestDisc > 0 && <Stars n={starsFromPct(latestDisc)} />}
              </div>
              <div>
                <p className="text-2xl font-black text-violet-600">{latestEmo || '—'}%</p>
                <p className="text-xs font-semibold text-slate-500">Emosi</p>
              </div>
            </div>
          </div>

          {/* KPI 4 kad */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Skor Disiplin',
                value: latestDisc ? `${latestDisc}%` : '—',
                badge: latestDisc ? labelBaik(latestDisc) : '—',
                icon: <BarChart2 className="text-white" size={20} />,
                grad: 'from-blue-500 to-indigo-600',
              },
              {
                label: 'Ketepatan (Refleksi)',
                value: attendancePct != null ? `${attendancePct}%` : '—',
                badge: attendancePct != null ? labelBaik(attendancePct) : 'Tiada data',
                icon: <Calendar className="text-white" size={20} />,
                grad: 'from-emerald-500 to-teal-600',
              },
              {
                label: 'Rekod Demerit / Kes',
                value: String(demerits),
                badge: demerits <= 2 ? 'BAIK' : 'PERHATIAN',
                icon: <Shield className="text-white" size={20} />,
                grad: 'from-amber-500 to-orange-600',
              },
              {
                label: 'Sesi Kaunseling',
                value: String(sessionDone),
                badge: 'SELESAI',
                icon: <User className="text-white" size={20} />,
                grad: 'from-violet-500 to-purple-600',
              },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50">
                <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${k.grad} p-2.5 shadow`}>{k.icon}</div>
                <p className="text-2xl font-black text-slate-900">{k.value}</p>
                <p className="text-sm font-semibold text-slate-700">{k.label}</p>
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {k.badge}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Trend line */}
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-base font-black text-slate-900">Trend Skor Disiplin (5 Bulan)</h2>
                {monthTrend.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Belum cukup data refleksi.</p>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="skor" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Pie tingkah laku */}
                <div className="rounded-2xl bg-white p-5 shadow-lg">
                  <h2 className="mb-2 text-sm font-black text-slate-900">Taburan Rekod (30 Hari)</h2>
                  {pieData.length === 0 ? (
                    <p className="py-10 text-center text-xs text-slate-400">Tiada rekod tingkah laku.</p>
                  ) : (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Kalendar refleksi */}
                <div className="rounded-2xl bg-white p-5 shadow-lg">
                  <h2 className="mb-3 text-sm font-black text-slate-900">
                    Refleksi Harian — {format(new Date(), 'MMMM yyyy', { locale: ms })}
                  </h2>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                    {['Is', 'Se', 'Ra', 'Kh', 'Ju', 'Sa', 'Ah'].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {calDays.map((d) => (
                      <div
                        key={d.date.toISOString()}
                        className={`aspect-square rounded-lg text-[10px] font-semibold flex items-center justify-center ${
                          d.hasRefleksi
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-50 text-slate-400'
                        } ${d.isToday ? 'ring-2 ring-indigo-500' : ''}`}
                        title={d.hasRefleksi ? 'Refleksi diisi' : 'Tiada refleksi'}
                      >
                        {format(d.date, 'd')}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Hijau = hari refleksi diisi (bukan kehadiran fizikal rasmi).</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Pencapaian */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-md">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="text-amber-600" size={20} />
                  <h2 className="font-black text-slate-900">Pencapaian & Penghargaan</h2>
                </div>
                {badges.length === 0 ? (
                  <p className="text-sm text-slate-600">Teruskan usaha — lencana akan muncul bila anak capai sasaran.</p>
                ) : (
                  <>
                    <p className="mb-3 text-sm font-semibold text-amber-900">
                      Tahniah! {selectedChild.full_name.split(' ')[0]} 🎉
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {badges.map((b) => (
                        <div key={b.id} className="rounded-xl bg-white/80 p-2 text-center shadow-sm">
                          <span className="text-xl">{b.icon ?? '🏅'}</span>
                          <p className="mt-1 text-[9px] font-bold leading-tight text-slate-700">{b.badge_name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="mt-3 text-xs text-slate-500">Streak: {points?.current_streak ?? 0} hari · Mata: {points?.total_points ?? 0}</p>
              </div>

              {/* Catatan GBK */}
              <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-lg">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                  <MessageCircle size={18} className="text-violet-600" />
                  Catatan Guru Kaunseling
                </h2>
                {parentNotes.length === 0 ? (
                  <p className="text-xs leading-relaxed text-slate-500">
                    Tiada catatan dikongsi lagi. GBK boleh kongsi ringkasan selamat melalui rekod intervensi (migration 014).
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {parentNotes.map((n) => (
                      <li key={n.id} className="rounded-xl bg-violet-50/80 p-3 text-xs text-slate-700">
                        <p className="leading-relaxed">{n.parent_note || '—'}</p>
                        <p className="mt-2 font-semibold text-violet-800">GBK · {n.session_date}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Sumber */}
              <div className="rounded-2xl bg-slate-50 p-5">
                <h2 className="mb-3 text-sm font-black text-slate-900">Sumber Untuk Ibu Bapa</h2>
                <ul className="space-y-2 text-xs font-semibold text-indigo-700">
                  <li className="flex items-center gap-2">
                    <BookOpen size={14} /> Panduan komunikasi di rumah
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart size={14} /> Tips bimbingan remaja
                  </li>
                  <li className="flex items-center gap-2">
                    <Smartphone size={14} /> Mengurus masa skrin anak
                  </li>
                </ul>
              </div>

              {/* Reach Out */}
              <div className="rounded-2xl bg-rose-50 p-5">
                <label className="text-xs font-bold text-slate-800">Reach Out kepada GBK</label>
                <textarea
                  value={parentReachOut}
                  onChange={(e) => setParentReachOut(e.target.value)}
                  className="input mt-2 min-h-[88px] text-xs"
                  placeholder="Kongsi kebimbangan anda..."
                />
                <button
                  type="button"
                  disabled={!parentReachOut.trim() || sendingReachOut}
                  onClick={async () => {
                    if (!profile || !selectedChildId) return
                    setSendingReachOut(true)
                    try {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const { error } = await (supabase as any).from('reach_out_messages').insert({
                        student_id: selectedChildId,
                        sender_id: profile.id,
                        message: parentReachOut.trim(),
                        source: 'ibu_bapa',
                        status: 'baru',
                      })
                      if (error) throw error
                      setParentReachOut('')
                      alert('Mesej dihantar kepada GBK.')
                    } catch (e) {
                      console.error(e)
                      alert('Gagal hantar.')
                    } finally {
                      setSendingReachOut(false)
                    }
                  }}
                  className="btn-primary mt-3 w-full text-xs"
                >
                  {sendingReachOut ? 'Menghantar...' : 'Hantar Reach Out'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PortalShell>
  )
}