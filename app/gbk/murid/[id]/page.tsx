'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Sparkles, ClipboardList } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { ModalOverlay } from '@/components/modal-overlay'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

type RiskLevel = 'hijau' | 'kuning' | 'jingga' | 'merah'

type Profile = {
  id: string
  full_name: string | null
  class_name: string | null
  ic_or_student_id: string | null
  ic_number: string | null
}

type Checkin = {
  id: string
  checkin_date: string
  total_score: number | null
  discipline_score: number | null
  emotional_score: number | null
  q7_perasaan_emosi: string | null
  q9_tahap_stres: number | null
  q10_perlukan_bantuan: string | null
}

type Intervention = {
  id: string
  session_date: string
  intervention_type: string
  objective: string | null
  summary: string | null
  follow_up_action: string | null
  case_status: string
  tarikh_susulan: string | null
  q10_perlukan_bantuan: string | null
}

const riskBadges: Record<RiskLevel, { bg: string; text: string; border: string; label: string }> = {
  hijau: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200', label: 'Hijau (Stabil)' },
  kuning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Kuning (Awas)' },
  jingga: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Jingga (Risiko)' },
  merah: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Merah (Kritikal)' },
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const studentId = params.id
  const { profile, loading: authLoading } = useAuth()

  const [data, setData] = useState<{
    profile: Profile | null
    risk: { level: RiskLevel; reason: string | null } | null
    checkins: Checkin[]
    interventions: Intervention[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // AI modal
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')

  // Intervention modal
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    intervention_type: 'kaunseling individu',
    objective: '',
    summary: '',
    follow_up_action: '',
    referral_to: '',
    follow_up_date: '',
    share_with_parent: false,
    parent_note: '',
  })

  useEffect(() => {
    if (!authLoading) {
      if (!profile) router.push('/login')
      else if (profile.role !== 'counselor' && profile.role !== 'admin') router.push('/dashboard')
      else fetchAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading])

  const fetchAll = async () => {
    try {
      const [{ data: p }, { data: risk }, { data: ci }, { data: iv }] = (await Promise.all([
        supabase.from('profiles').select('id, full_name, class_name, ic_or_student_id, ic_number').eq('id', studentId).single(),
        supabase.from('risk_levels').select('level, reason').eq('student_id', studentId).eq('is_active', true).maybeSingle(),
        supabase.from('checkins').select('id, checkin_date, total_score, discipline_score, emotional_score, q7_perasaan_emosi, q9_tahap_stres, q10_perlukan_bantuan').eq('student_id', studentId).order('checkin_date', { ascending: true }).limit(30),
        supabase.from('intervention_records').select('id, session_date, intervention_type, objective, summary, follow_up_action, case_status, tarikh_susulan').eq('student_id', studentId).order('session_date', { ascending: false }),
      ])) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      setData({
        profile: (p as Profile) || null,
        risk: risk ? { level: risk.level as RiskLevel, reason: risk.reason } : null,
        checkins: (ci as Checkin[]) || [],
        interventions: (iv as Intervention[]) || [],
      })
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(
    () =>
      (data?.checkins || []).map((c) => ({
        date: c.checkin_date.slice(5),
        Emosi: c.emotional_score ?? null,
        Disiplin: c.discipline_score ?? null,
        Total: c.total_score ?? null,
      })),
    [data]
  )

  const runAiAnalysis = async () => {
    setAiOpen(true)
    setAiResult('')
    setAiError('')
    setAiLoading(true)
    try {
      const { data: sd } = await supabase.auth.getSession()
      const token = sd.session?.access_token
      if (!token) throw new Error('Sesi tamat. Log masuk semula.')
      const res = await fetch('/api/gbk/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ student_id: studentId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal dapatkan analisis')
      setAiResult(json.analysis || 'Tiada analisis dijana.')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Ralat tidak diketahui')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmitIntervention = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await (supabase.from('intervention_records') as any).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
        student_id: studentId,
        counselor_id: profile!.id,
        session_date: new Date().toISOString().split('T')[0],
        intervention_type: form.intervention_type,
        objective: form.objective,
        summary: form.summary,
        follow_up_action: form.follow_up_action,
        referral_to: form.referral_to || null,
        tarikh_susulan: form.follow_up_date || null,
        case_status: 'baru',
        share_with_parent: form.share_with_parent,
        parent_note: form.share_with_parent ? form.parent_note.trim() || null : null,
      })
      if (error) throw error
      setShowModal(false)
      alert('✅ Rekod disimpan.')
      fetchAll()
    } catch (error) {
      console.error(error)
      alert('❌ Gagal menyimpan intervensi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Profil Murid">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </PortalShell>
    )
  }

  const badge = data?.risk ? riskBadges[data.risk.level] : null

  return (
    <PortalShell title="Profil Murid" subtitle={data?.profile?.full_name || ''}>
      <Link href="/gbk" className="mb-6 inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
        <ArrowLeft size={16} /> Kembali ke Pemantauan GBK
      </Link>

      {/* Header */}
      <section className="card mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{data?.profile?.full_name}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {data?.profile?.class_name || 'Kelas tidak ditetapkan'}
            {data?.profile?.ic_or_student_id ? ` · ID: ${data.profile.ic_or_student_id}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
              {badge.label.toUpperCase()}
            </span>
          )}
          <button onClick={runAiAnalysis} className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1">
            <Sparkles size={14} /> Analisis AI
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm py-2 px-3 inline-flex items-center gap-1">
            <ClipboardList size={14} /> Intervensi
          </button>
        </div>
      </section>

      {data?.risk?.reason && (
        <p className="mb-6 rounded-lg bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
          Sebab risiko: {data.risk.reason}
        </p>
      )}

      {/* Chart */}
      <section className="card mb-6">
        <h3 className="mb-4 text-lg font-bold text-neutral-900">Trend Skor (30 check-in terkini)</h3>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Tiada rekod check-in.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Emosi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Disiplin" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Total" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Recent check-ins */}
      <section className="card mb-6">
        <h3 className="mb-4 text-lg font-bold text-neutral-900">Rekod Check-in Terkini</h3>
        {data?.checkins.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Tiada rekod.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  {['Tarikh', 'Total', 'Disiplin', 'Emosi', 'Perasaan', 'Stres', 'Bantuan'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data!.checkins.slice().reverse().map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-3 text-sm text-neutral-700">{c.checkin_date}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-primary-600">{c.total_score ?? '-'}</td>
                    <td className="px-6 py-3 text-sm text-sky-600">{c.discipline_score ?? '-'}</td>
                    <td className="px-6 py-3 text-sm text-violet-600">{c.emotional_score ?? '-'}</td>
                    <td className="px-6 py-3 text-sm capitalize text-neutral-700">{c.q7_perasaan_emosi || '-'}</td>
                    <td className="px-6 py-3 text-sm text-neutral-700">{c.q9_tahap_stres ?? '-'}</td>
                    <td className="px-6 py-3 text-sm capitalize text-neutral-700">{c.q10_perlukan_bantuan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Intervention history */}
      <section className="card">
        <h3 className="mb-4 text-lg font-bold text-neutral-900">Sejarah Intervensi ({data?.interventions.length || 0})</h3>
        {data?.interventions.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Belum ada rekod intervensi.</p>
        ) : (
          <ul className="space-y-3">
            {data!.interventions.map((iv) => {
              const overdue = iv.tarikh_susulan && iv.case_status !== 'selesai' && new Date(iv.tarikh_susulan) < new Date()
              return (
                <li key={iv.id} className="rounded-xl border border-neutral-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900">{iv.intervention_type}</span>
                    <span className="text-xs text-neutral-500">
                      {new Date(iv.session_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      <span className="uppercase">{iv.case_status}</span>
                    </span>
                  </div>
                  {iv.objective && <p className="mt-2 text-sm text-neutral-700"><b>Objektif:</b> {iv.objective}</p>}
                  {iv.summary && <p className="mt-1 text-sm text-neutral-600">{iv.summary}</p>}
                  {iv.follow_up_action && <p className="mt-1 text-sm text-neutral-600"><b>Susulan:</b> {iv.follow_up_action}</p>}
                  {iv.tarikh_susulan && (
                    <p className={`mt-1 text-xs ${overdue ? 'font-bold text-red-600' : 'text-neutral-500'}`}>
                      Tarikh susulan: {iv.tarikh_susulan}{overdue ? ' (LEWAT)' : ''}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* AI Modal */}
      <ModalOverlay
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Analisis AI"
        subtitle={data?.profile?.full_name ? `Murid: ${data.profile.full_name}` : undefined}
        size="lg"
        footer={
          <button type="button" onClick={() => setAiOpen(false)} className="btn-secondary w-full">
            Tutup
          </button>
        }
      >
        {aiLoading && (
          <div className="flex items-center gap-3 py-10 text-neutral-500">
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            Sedang menganalisis...
          </div>
        )}
        {aiError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{aiError}</div>}
        {aiResult && !aiLoading && (
          <div className="ai-markdown max-h-[55dvh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {aiResult}
          </div>
        )}
        {!aiLoading && !aiResult && !aiError && (
          <div className="py-10 text-center text-sm text-neutral-500">Tiada analisis.</div>
        )}
      </ModalOverlay>

      {/* Intervention Modal */}
      <ModalOverlay
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Rekod Intervensi"
        subtitle={data?.profile?.full_name ? `Murid: ${data.profile.full_name}` : undefined}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1" disabled={submitting}>Batal</button>
            <button type="submit" form="detail-intervention-form" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <form id="detail-intervention-form" onSubmit={handleSubmitIntervention} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Jenis Intervensi</label>
            <select value={form.intervention_type} onChange={(e) => setForm({ ...form, intervention_type: e.target.value })} className="input" required>
              <option value="kaunseling individu">Kaunseling Individu</option>
              <option value="bimbingan kumpulan">Bimbingan Kumpulan</option>
              <option value="motivasi">Motivasi</option>
              <option value="rujukan ibu bapa">Rujukan Ibu Bapa</option>
              <option value="lain-lain">Lain-lain</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Objektif</label>
            <textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} className="input min-h-[80px]" rows={2} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Ringkasan Sesi</label>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="input min-h-[100px]" rows={3} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Tindakan Susulan</label>
            <textarea value={form.follow_up_action} onChange={(e) => setForm({ ...form, follow_up_action: e.target.value })} className="input min-h-[80px]" rows={2} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Rujukan Kepada (opsyen)</label>
            <input type="text" value={form.referral_to} onChange={(e) => setForm({ ...form, referral_to: e.target.value })} className="input" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Tarikh Susulan (opsyen)</label>
            <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} className="input" />
          </div>
        </form>
      </ModalOverlay>
    </PortalShell>
  )
}
