'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { ModalOverlay } from '@/components/modal-overlay'
import { useReachOutBadges } from '@/lib/use-reach-out-badges'
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle } from 'lucide-react'

type RiskLevel = 'hijau' | 'kuning' | 'jingga' | 'merah'

type StudentRisk = {
  student_id: string
  full_name: string
  class_name: string | null
  level: RiskLevel
  avg_score: number
  trend: number
  last_checkin: string
}

type InterventionForm = {
  student_id: string
  student_name: string
  intervention_type: string
  objective: string
  summary: string
  follow_up_action: string
  referral_to: string
  share_with_parent: boolean
  parent_note: string
}

type SessionRow = {
  id: string
  student_id: string
  student_name: string
  class_name: string | null
  session_date: string
  session_time: string
  purpose: string | null
  status: string
}

export default function GBKDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const { counts: reachBadges } = useReachOutBadges(profile?.role, profile?.id)
  const [students, setStudents] = useState<StudentRisk[]>([])
  const [openCaseStudentIds, setOpenCaseStudentIds] = useState<Set<string>>(new Set())
  const [pendingSessions, setPendingSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [riskListLevel, setRiskListLevel] = useState<RiskLevel | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<InterventionForm>({
    student_id: '',
    student_name: '',
    intervention_type: 'kaunseling individu',
    objective: '',
    summary: '',
    follow_up_action: '',
    referral_to: '',
    share_with_parent: false,
    parent_note: '',
  })

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.push('/login')
      } else if (profile.role !== 'counselor' && profile.role !== 'admin') {
        router.push('/dashboard')
      } else {
        fetchStudents()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading])

  const fetchStudents = async () => {
    try {
      // Get all students with risk levels
      const { data: riskData, error: riskError } = await supabase
        .from('risk_levels')
        .select('student_id, level')
        .eq('is_active', true)

      if (riskError) throw riskError

      type RiskRow = { student_id: string; level: string }
      const typedRiskData = (riskData || []) as RiskRow[]

      if (typedRiskData.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // Get profiles for those students
      const studentIds = typedRiskData.map((r) => r.student_id)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, class_name')
        .in('id', studentIds)
        .eq('role', 'student')

      if (profileError) throw profileError

      // Murid yang sudah ada kes aktif (GBK dah ambil tindakan) — keluar dari senarai perhatian
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: openCases, error: caseErr } = await (supabase as any)
        .from('intervention_records')
        .select('student_id')
        .neq('case_status', 'selesai')

      if (caseErr) throw caseErr

      const triaged = new Set<string>(
        ((openCases || []) as { student_id: string }[]).map((c) => c.student_id)
      )
      setOpenCaseStudentIds(triaged)

      // Fetch pending counseling sessions (murid tempah, belum disahkan)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessions, error: sessErr } = await (supabase as any)
        .from('counseling_sessions')
        .select('id, student_id, session_date, session_time, purpose, status')
        .eq('status', 'pending')
        .order('session_date', { ascending: true })

      if (sessErr) throw sessErr

      // Map student names
      const sessionStudentIds = ((sessions || []) as { student_id: string }[]).map((s) => s.student_id)
      let sessionProfileMap = new Map<string, { full_name: string; class_name: string | null }>()
      if (sessionStudentIds.length > 0) {
        const { data: sessProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, class_name')
          .in('id', sessionStudentIds)
        sessionProfileMap = new Map(
          ((sessProfiles || []) as { id: string; full_name: string; class_name: string | null }[]).map((p) => [
            p.id,
            { full_name: p.full_name, class_name: p.class_name },
          ])
        )
      }

      const sessionRows: SessionRow[] = ((sessions || []) as {
        id: string
        student_id: string
        session_date: string
        session_time: string
        purpose: string | null
        status: string
      }[]).map((s) => {
        const p = sessionProfileMap.get(s.student_id)
        return {
          ...s,
          student_name: p?.full_name || 'Unknown',
          class_name: p?.class_name || null,
        }
      })
      setPendingSessions(sessionRows)

      // Get recent checkins (last 14 days)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: checkins, error: checkinError } = await supabase
        .from('checkins')
        .select('student_id, emotional_score, checkin_date')
        .in('student_id', studentIds)
        .gte('checkin_date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false })

      if (checkinError) throw checkinError

      type CheckinRow = { student_id: string; emotional_score: number | null; checkin_date: string }
      const typedCheckins = (checkins || []) as CheckinRow[]

      // Build stats map
      const statsMap = new Map<
        string,
        { recentSum: number; recentCount: number; oldSum: number; oldCount: number; last: string }
      >()

      typedCheckins.forEach((c) => {
        const sid = c.student_id
        const cdate = new Date(c.checkin_date)
        const recent = cdate >= sevenDaysAgo
        const old = cdate >= fourteenDaysAgo && cdate < sevenDaysAgo

        if (!statsMap.has(sid)) {
          statsMap.set(sid, {
            recentSum: 0,
            recentCount: 0,
            oldSum: 0,
            oldCount: 0,
            last: c.checkin_date,
          })
        }
        const entry = statsMap.get(sid)!

        const score = c.emotional_score || 0
        if (recent) {
          entry.recentSum += score
          entry.recentCount++
        }
        if (old) {
          entry.oldSum += score
          entry.oldCount++
        }
      })

      // Build profile map
      type ProfileRow = { id: string; full_name: string; class_name: string | null }
      const typedProfiles = (profiles || []) as ProfileRow[]
      const profileMap = new Map<string, { full_name: string; class_name: string | null }>()
      typedProfiles.forEach((p) => {
        profileMap.set(p.id, { full_name: p.full_name, class_name: p.class_name })
      })

      // Merge
      const merged: StudentRisk[] = typedRiskData.map((r) => {
        const sid = r.student_id
        const profile = profileMap.get(sid)
        const stats = statsMap.get(sid)
        const recentAvg = stats && stats.recentCount > 0 ? stats.recentSum / stats.recentCount : 0
        const oldAvg = stats && stats.oldCount > 0 ? stats.oldSum / stats.oldCount : 0
        const trend = recentAvg - oldAvg

        return {
          student_id: sid,
          full_name: profile?.full_name || 'Unknown',
          class_name: profile?.class_name || null,
          level: r.level as RiskLevel,
          avg_score: Math.round(recentAvg),
          trend: Math.round(trend),
          last_checkin: stats?.last || '-',
        }
      })

      // Sort
      const order: Record<RiskLevel, number> = { merah: 0, jingga: 1, kuning: 2, hijau: 3 }
      merged.sort((a, b) => {
        const diff = order[a.level] - order[b.level]
        if (diff !== 0) return diff
        return a.avg_score - b.avg_score
      })

      setStudents(merged)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const attentionStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          (s.level === 'merah' || s.level === 'jingga' || s.level === 'kuning') &&
          !openCaseStudentIds.has(s.student_id)
      ),
    [students, openCaseStudentIds]
  )

  const counts = {
    hijau: students.filter((s) => s.level === 'hijau').length,
    kuning: students.filter((s) => s.level === 'kuning').length,
    jingga: students.filter((s) => s.level === 'jingga').length,
    merah: students.filter((s) => s.level === 'merah').length,
  }

  const riskLevelTitles: Record<RiskLevel, string> = {
    hijau: 'Hijau (Stabil)',
    kuning: 'Kuning (Awas)',
    jingga: 'Jingga (Risiko)',
    merah: 'Merah (Kritikal)',
  }

  const studentsInLevel = (level: RiskLevel) => students.filter((s) => s.level === level)

  const openRiskList = (level: RiskLevel) => setRiskListLevel(level)

  const riskBadges: Record<RiskLevel, { bg: string; text: string; border: string }> = {
    hijau: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200' },
    kuning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    jingga: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    merah: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  }

  const openInterventionModal = (student: StudentRisk) => {
    setForm({
      student_id: student.student_id,
      student_name: student.full_name,
      intervention_type: 'kaunseling individu',
      objective: '',
      summary: '',
      follow_up_action: '',
      referral_to: '',
      share_with_parent: false,
      parent_note: '',
    })
    setShowModal(true)
  }

  async function confirmSession(sessionId: string, action: 'disahkan' | 'dibatalkan') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('counseling_sessions')
        .update({ status: action })
        .eq('id', sessionId)
      if (error) throw error
      await fetchStudents()
    } catch (e) {
      alert('Gagal: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const handleSubmitIntervention = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('intervention_records') as any).insert({
        student_id: form.student_id,
        counselor_id: profile!.id,
        session_date: new Date().toISOString().split('T')[0],
        intervention_type: form.intervention_type,
        objective: form.objective,
        summary: form.summary,
        follow_up_action: form.follow_up_action,
        referral_to: form.referral_to || null,
        case_status: 'baru',
        share_with_parent: form.share_with_parent,
        parent_note: form.share_with_parent ? form.parent_note.trim() || null : null,
      })

      if (error) throw error

      setShowModal(false)
      alert('✅ Rekod disimpan. Murid keluar dari senarai perhatian. Urus & cetak di Pengurusan Kes.')
      fetchStudents()
    } catch (error) {
      console.error('Error saving intervention:', error)
      alert('❌ Gagal menyimpan intervensi. Sila cuba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Dashboard GBK">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Dashboard GBK" subtitle="Pemantauan risiko, intervensi awal dan sesi kaunseling">
      {/* Risk Level Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="Hijau (Stabil)"
          value={counts.hijau}
          icon={<CheckCircle2 size={22} />}
          tone="green"
          subtitle="Tiada risiko"
          onClick={() => openRiskList('hijau')}
        />
        <StatCard
          label="Kuning (Awas)"
          value={counts.kuning}
          icon={<AlertCircle size={22} />}
          tone="orange"
          subtitle="Perlu pantau"
          onClick={() => openRiskList('kuning')}
        />
        <StatCard
          label="Jingga (Risiko)"
          value={counts.jingga}
          icon={<AlertTriangle size={22} />}
          tone="orange"
          subtitle="Perlu tindakan"
          onClick={() => openRiskList('jingga')}
        />
        <StatCard
          label="Merah (Kritikal)"
          value={counts.merah}
          icon={<XCircle size={22} />}
          tone="red"
          subtitle="Segera"
          onClick={() => openRiskList('merah')}
        />
      </div>

      {/* Pending Counseling Sessions */}
      {pendingSessions.length > 0 && (
        <section className="card mb-8 border-l-4 border-l-cyan-500">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">
              Permohonan Sesi Kaunseling ({pendingSessions.length})
            </h2>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">Menunggu Pengesahan</span>
          </div>
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  {['Murid', 'Kelas', 'Tarikh', 'Masa', 'Tujuan', 'Tindakan'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pendingSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{s.student_name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{s.class_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {new Date(s.session_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{s.session_time}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate" title={s.purpose || ''}>
                      {s.purpose || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => confirmSession(s.id, 'disahkan')}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          Sahkan
                        </button>
                        <button
                          onClick={() => confirmSession(s.id, 'dibatalkan')}
                          className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          Batal
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Students Table */}
      <section className="card">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-neutral-900">Murid Perlu Perhatian</h2>
          <p className="w-full text-xs text-neutral-500 sm:w-auto">
            Jingga / kuning / merah tanpa kes aktif. Selepas intervensi → lihat di Pengurusan Kes.
          </p>
          <Link href="/gbk/kes" className="btn-secondary text-sm py-2 px-4">
            📋 Pengurusan Kes
          </Link>
          <Link href="/gbk/reach-out" className="btn-secondary relative text-sm py-2 px-4">
            📬 Reach Out
            {reachBadges.gbkNew > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {reachBadges.gbkNew > 9 ? '9+' : reachBadges.gbkNew}
              </span>
            )}
          </Link>
        </div>
        {attentionStudents.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">
            Tiada murid menunggu tindakan — semua ada kes aktif atau risiko hijau/stabil.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  {['Murid', 'Kelas', 'Skor Emosi (7d avg)', 'Trend', 'Risiko', 'Tindakan'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {attentionStudents.map((s) => (
                  <tr key={s.student_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{s.full_name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{s.class_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-primary-600">{s.avg_score}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${s.trend >= 0 ? 'text-accent-600' : 'text-red-600'}`}>
                        {s.trend > 0 ? '+' : ''}{s.trend}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                          riskBadges[s.level].bg
                        } ${riskBadges[s.level].text} ${riskBadges[s.level].border}`}
                      >
                        {s.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => openInterventionModal(s)} className="btn-primary text-xs py-2 px-4">
                        Intervensi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ModalOverlay
        open={riskListLevel !== null}
        onClose={() => setRiskListLevel(null)}
        title={riskListLevel ? riskLevelTitles[riskListLevel] : ''}
        subtitle={
          riskListLevel
            ? `${studentsInLevel(riskListLevel).length} murid dalam kategori ini`
            : undefined
        }
        size="md"
        footer={
          <button type="button" onClick={() => setRiskListLevel(null)} className="btn-secondary w-full">
            Tutup
          </button>
        }
      >
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-100">
          {riskListLevel && studentsInLevel(riskListLevel).length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-neutral-500">Tiada murid dalam kategori ini.</li>
          ) : (
            riskListLevel &&
            studentsInLevel(riskListLevel).map((s) => (
              <li key={s.student_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900">{s.full_name}</p>
                  <p className="text-sm text-neutral-500">{s.class_name || 'Kelas tidak ditetapkan'}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Skor emosi (7h): {s.avg_score}% · refleksi terakhir: {s.last_checkin}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRiskListLevel(null)
                    openInterventionModal(s)
                  }}
                  className="btn-primary shrink-0 text-xs py-2 px-3 sm:w-auto w-full"
                >
                  Intervensi
                </button>
              </li>
            ))
          )}
        </ul>
      </ModalOverlay>

      <ModalOverlay
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Rekod Intervensi"
        subtitle={form.student_name ? `Murid: ${form.student_name}` : undefined}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1" disabled={submitting}>
              Batal
            </button>
            <button type="submit" form="gbk-intervention-form" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <form id="gbk-intervention-form" onSubmit={handleSubmitIntervention} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Murid</label>
            <input type="text" value={form.student_name} disabled className="input bg-neutral-100" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Jenis Intervensi</label>
            <select
              value={form.intervention_type}
              onChange={(e) => setForm({ ...form, intervention_type: e.target.value })}
              className="input"
              required
            >
              <option value="kaunseling individu">Kaunseling Individu</option>
              <option value="bimbingan kumpulan">Bimbingan Kumpulan</option>
              <option value="motivasi">Motivasi</option>
              <option value="rujukan ibu bapa">Rujukan Ibu Bapa</option>
              <option value="lain-lain">Lain-lain</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Objektif</label>
            <textarea
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              className="input min-h-[80px]"
              rows={2}
              placeholder="Contoh: Bantu murid atasi masalah disiplin"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Ringkasan Sesi</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="input min-h-[100px]"
              rows={3}
              placeholder="Apa yang dibincangkan..."
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Tindakan Susulan</label>
            <textarea
              value={form.follow_up_action}
              onChange={(e) => setForm({ ...form, follow_up_action: e.target.value })}
              className="input min-h-[80px]"
              rows={2}
              placeholder="Contoh: Pantau 2 minggu, jumpa ibu bapa"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Rujukan Kepada (opsyen)</label>
            <input
              type="text"
              value={form.referral_to}
              onChange={(e) => setForm({ ...form, referral_to: e.target.value })}
              className="input"
              placeholder="Contoh: Ibu bapa, pakar psikologi"
            />
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-violet-900">
              <input
                type="checkbox"
                checked={form.share_with_parent}
                onChange={(e) => setForm({ ...form, share_with_parent: e.target.checked })}
                className="h-4 w-4 rounded border-violet-300"
              />
              Kongsi ringkasan dengan ibu bapa (portal /ibu-bapa)
            </label>
            {form.share_with_parent && (
              <textarea
                value={form.parent_note}
                onChange={(e) => setForm({ ...form, parent_note: e.target.value })}
                className="input min-h-[80px] text-sm"
                placeholder="Mesej selamat untuk ibu bapa — jangan masukkan nota sulit dalaman."
              />
            )}
          </div>
        </form>
      </ModalOverlay>
    </PortalShell>
  )
}
