'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_ORDER,
  CaseStatus,
  caseStatusBadgeClass,
} from '@/lib/case-status'
import { ClipboardList, ArrowLeft, CheckCircle2, Pin } from 'lucide-react'

type CaseRow = {
  id: string
  student_id: string
  session_date: string
  intervention_type: string | null
  objective: string | null
  summary: string | null
  follow_up_action: string | null
  case_status: CaseStatus
  updated_at: string
  student_name: string
  class_name: string | null
}

type FilterMode = 'aktif' | 'semua' | CaseStatus

export default function GBKCasesPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('aktif')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (profile.role !== 'counselor' && profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    fetchCases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchCases() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cases, error } = await (supabase as any)
        .from('intervention_records')
        .select(
          'id, student_id, session_date, intervention_type, objective, summary, follow_up_action, case_status, updated_at'
        )
        .order('updated_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const typed = (cases || []) as Omit<CaseRow, 'student_name' | 'class_name'>[]
      if (typed.length === 0) {
        setRows([])
        return
      }

      const ids = [...new Set(typed.map((c) => c.student_id))]
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, class_name')
        .in('id', ids)

      if (pErr) throw pErr

      type P = { id: string; full_name: string; class_name: string | null }
      const pmap = new Map((profiles as P[] | null)?.map((p) => [p.id, p]) || [])

      setRows(
        typed.map((c) => {
          const p = pmap.get(c.student_id)
          return {
            ...c,
            case_status: (c.case_status || 'baru') as CaseStatus,
            student_name: p?.full_name || '—',
            class_name: p?.class_name ?? null,
          }
        })
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'semua') return rows
    if (filter === 'aktif') return rows.filter((r) => r.case_status !== 'selesai')
    return rows.filter((r) => r.case_status === filter)
  }, [rows, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { aktif: 0 }
    CASE_STATUS_ORDER.forEach((s) => {
      c[s] = rows.filter((r) => r.case_status === s).length
    })
    c.aktif = rows.filter((r) => r.case_status !== 'selesai').length
    return c
  }, [rows])

  async function updateStatus(id: string, case_status: CaseStatus) {
    setSavingId(id)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('intervention_records')
        .update({ case_status })
        .eq('id', id)

      if (error) throw error
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, case_status } : r)))
    } catch (e) {
      console.error(e)
      alert('Gagal kemas kini status. Pastikan migration 011 (susulan) dah apply jika pilih Susulan.')
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Pengurusan Kes">
        <div className="flex justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      title="Pengurusan Kes"
      subtitle="Kitaran: Baru → Dalam Tindakan → Susulan → Selesai (atau Rujuk Luar)"
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/gbk"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Pemantauan Risiko
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Kes Aktif" value={counts.aktif} icon={<ClipboardList size={22} />} tone="blue" subtitle="Belum selesai" />
        {CASE_STATUS_ORDER.map((s) => (
          <StatCard
            key={s}
            label={CASE_STATUS_LABELS[s]}
            value={counts[s] ?? 0}
            icon={s === 'selesai' ? <CheckCircle2 size={22} /> : <Pin size={22} />}
            tone={s === 'selesai' ? 'green' : s === 'rujuk_luar' ? 'orange' : 'purple'}
            subtitle=""
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['aktif', 'Kes Aktif'],
            ['semua', 'Semua'],
            ...CASE_STATUS_ORDER.map((s) => [s, CASE_STATUS_LABELS[s]] as const),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as FilterMode)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === key ? 'bg-primary-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
          <ClipboardList className="text-primary-600" size={22} />
          <h2 className="text-lg font-black text-slate-900">Senarai Kes ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Tiada kes. Rekod intervensi dari{' '}
            <Link href="/gbk" className="font-semibold text-primary-600 underline">
              Pemantauan GBK
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  {['Murid', 'Kelas', 'Tarikh', 'Jenis', 'Objektif', 'Status', 'Ringkasan'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.student_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.class_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.session_date}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{r.intervention_type || '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] text-slate-600 line-clamp-2">{r.objective || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.case_status}
                        disabled={savingId === r.id}
                        onChange={(e) => updateStatus(r.id, e.target.value as CaseStatus)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${caseStatusBadgeClass(r.case_status)}`}
                      >
                        {CASE_STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {CASE_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 max-w-[240px] text-xs text-slate-500 line-clamp-3">{r.summary || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  )
}