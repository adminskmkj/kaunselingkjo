'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'

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
}

export default function GBKDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<StudentRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<InterventionForm>({
    student_id: '',
    student_name: '',
    intervention_type: 'kaunseling individu',
    objective: '',
    summary: '',
    follow_up_action: '',
    referral_to: '',
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

      // Get recent checkins (last 14 days)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: checkins, error: checkinError } = await supabase
        .from('checkins')
        .select('student_id, total_score, checkin_date')
        .in('student_id', studentIds)
        .gte('checkin_date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false })

      if (checkinError) throw checkinError

      type CheckinRow = { student_id: string; total_score: number | null; checkin_date: string }
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

        const score = c.total_score || 0
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

  const counts = {
    hijau: students.filter((s) => s.level === 'hijau').length,
    kuning: students.filter((s) => s.level === 'kuning').length,
    jingga: students.filter((s) => s.level === 'jingga').length,
    merah: students.filter((s) => s.level === 'merah').length,
  }

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
    })
    setShowModal(true)
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
      })

      if (error) throw error

      setShowModal(false)
      alert('✅ Rekod intervensi berjaya disimpan.')
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
        <StatCard label="Hijau (Stabil)" value={counts.hijau} icon="🟢" tone="green" subtitle="Tiada risiko" />
        <StatCard label="Kuning (Awas)" value={counts.kuning} icon="🟡" tone="orange" subtitle="Perlu pantau" />
        <StatCard label="Jingga (Risiko)" value={counts.jingga} icon="🟠" tone="orange" subtitle="Perlu tindakan" />
        <StatCard label="Merah (Kritikal)" value={counts.merah} icon="🔴" tone="red" subtitle="Segera" />
      </div>

      {/* Students Table */}
      <section className="card">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Murid Perlu Perhatian</h2>
        {students.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">Tiada data murid. Pastikan murid dah login dan isi refleksi.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  {['Murid', 'Kelas', 'Skor (7d avg)', 'Trend', 'Risiko', 'Tindakan'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {students.map((s) => (
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

      {/* Intervention Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-strong p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">Rekod Intervensi</h2>
            <form onSubmit={handleSubmitIntervention} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Murid</label>
                <input type="text" value={form.student_name} disabled className="input bg-neutral-100" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Jenis Intervensi</label>
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
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Objektif</label>
                <textarea
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Contoh: Bantu murid atasi masalah disiplin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Ringkasan Sesi</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Apa yang dibincangkan..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Tindakan Susulan</label>
                <textarea
                  value={form.follow_up_action}
                  onChange={(e) => setForm({ ...form, follow_up_action: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Contoh: Pantau 2 minggu, jumpa ibu bapa"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Rujukan Kepada (opsyen)</label>
                <input
                  type="text"
                  value={form.referral_to}
                  onChange={(e) => setForm({ ...form, referral_to: e.target.value })}
                  className="input"
                  placeholder="Contoh: Ibu bapa, pakar psikologi"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1" disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalShell>
  )
}
