'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { StatusChangeModal } from '@/components/status-change-modal'
import { ModalOverlay } from '@/components/modal-overlay'
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_ORDER,
  CaseStatus,
  caseStatusBadgeClass,
} from '@/lib/case-status'
import { formatStatusLogLine, isCaseOverdue } from '@/lib/case-status-change'
import { openInterventionPrint } from '@/lib/intervention-print'
import { ClipboardList, ArrowLeft, CheckCircle2, Pin, AlertTriangle, History, Printer } from 'lucide-react'

type CaseRow = {
  id: string
  student_id: string
  session_date: string
  intervention_type: string | null
  objective: string | null
  summary: string | null
  follow_up_action: string | null
  case_status: CaseStatus
  tarikh_susulan: string | null
  referral_to: string | null
  counselor_id: string | null
  counselor_name: string
  updated_at: string
  student_name: string
  class_name: string | null
}

type StatusLog = {
  id: string
  from_status: CaseStatus | null
  to_status: CaseStatus
  nota: string | null
  tarikh_susulan: string | null
  agensi_rujukan: string | null
  created_at: string
  counselor_name: string
}

type FilterMode = 'aktif' | 'semua' | 'overdue' | CaseStatus

export default function GBKCasesPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('aktif')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [statusModalRow, setStatusModalRow] = useState<CaseRow | null>(null)
  const [statusModalTo, setStatusModalTo] = useState<CaseStatus>('dalam_tindakan')
  const [historyRow, setHistoryRow] = useState<CaseRow | null>(null)
  const [historyLogs, setHistoryLogs] = useState<StatusLog[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

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
          'id, student_id, counselor_id, session_date, intervention_type, objective, summary, follow_up_action, case_status, tarikh_susulan, referral_to, updated_at'
        )
        .order('updated_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const typed = (cases || []) as Omit<CaseRow, 'student_name' | 'class_name' | 'counselor_name'>[]
      if (typed.length === 0) {
        setRows([])
        return
      }

      const ids = [...new Set(typed.map((c) => c.student_id))]
      const cids = [...new Set(typed.map((c) => c.counselor_id).filter(Boolean))] as string[]
      const allProfileIds = [...new Set([...ids, ...cids])]
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, class_name')
        .in('id', allProfileIds)

      if (pErr) throw pErr

      type P = { id: string; full_name: string; class_name: string | null }
      const pmap = new Map((profiles as P[] | null)?.map((p) => [p.id, p]) || [])

      setRows(
        typed.map((c) => {
          const p = pmap.get(c.student_id)
          const counselor = c.counselor_id ? pmap.get(c.counselor_id) : null
          return {
            ...c,
            case_status: (c.case_status || 'baru') as CaseStatus,
            student_name: p?.full_name || '—',
            class_name: p?.class_name ?? null,
            counselor_name: counselor?.full_name || 'GBK',
          }
        })
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const overdueCount = useMemo(
    () => rows.filter((r) => isCaseOverdue(r.case_status, r.tarikh_susulan)).length,
    [rows]
  )

  const filtered = useMemo(() => {
    if (filter === 'semua') return rows
    if (filter === 'aktif') return rows.filter((r) => r.case_status !== 'selesai')
    if (filter === 'overdue') return rows.filter((r) => isCaseOverdue(r.case_status, r.tarikh_susulan))
    return rows.filter((r) => r.case_status === filter)
  }, [rows, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { aktif: 0, overdue: overdueCount }
    CASE_STATUS_ORDER.forEach((s) => {
      c[s] = rows.filter((r) => r.case_status === s).length
    })
    c.aktif = rows.filter((r) => r.case_status !== 'selesai').length
    return c
  }, [rows, overdueCount])

  function openStatusModal(row: CaseRow, toStatus: CaseStatus) {
    if (toStatus === row.case_status) return
    setStatusModalRow(row)
    setStatusModalTo(toStatus)
  }

  async function confirmStatusChange(payload: {
    toStatus: CaseStatus
    nota: string
    tarikhSusulan: string
    agensiRujukan: string
  }) {
    if (!statusModalRow) return
    const id = statusModalRow.id
    setSavingId(id)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('change_case_status', {
        p_case_id: id,
        p_to_status: payload.toStatus,
        p_nota: payload.nota || null,
        p_tarikh_susulan: payload.tarikhSusulan || null,
        p_agensi_rujukan: payload.agensiRujukan || null,
      })
      if (error) throw error
      await fetchCases()
      setStatusModalRow(null)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Gagal kemas kini status. Pastikan migration 016 dah apply.')
    } finally {
      setSavingId(null)
    }
  }

  async function openHistory(row: CaseRow) {
    setHistoryRow(row)
    setHistoryLogs([])
    setHistoryLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs, error } = await (supabase as any)
        .from('case_status_logs')
        .select('id, from_status, to_status, nota, tarikh_susulan, agensi_rujukan, created_at, counselor_id')
        .eq('case_id', row.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const raw = (logs || []) as Array<{
        id: string
        from_status: CaseStatus | null
        to_status: CaseStatus
        nota: string | null
        tarikh_susulan: string | null
        agensi_rujukan: string | null
        created_at: string
        counselor_id: string | null
      }>

      const cids = [...new Set(raw.map((l) => l.counselor_id).filter(Boolean))] as string[]
      let names = new Map<string, string>()
      if (cids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', cids)
        names = new Map((profs || []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]))
      }

      setHistoryLogs(
        raw.map((l) => ({
          ...l,
          counselor_name: (l.counselor_id && names.get(l.counselor_id)) || 'GBK',
        }))
      )
    } catch (e) {
      console.error(e)
      alert('Gagal muat history. Migration 016 perlu apply.')
    } finally {
      setHistoryLoading(false)
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
      subtitle="Setiap perubahan status direkod — susulan, tarikh & penutup wajib ikut peraturan"
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/gbk"
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <ArrowLeft size={16} /> Pemantauan Risiko
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Kes Aktif" value={counts.aktif} icon={<ClipboardList size={22} />} tone="blue" subtitle="Belum selesai" />
        <StatCard
          label="Overdue"
          value={counts.overdue}
          icon={<AlertTriangle size={22} />}
          tone="red"
          subtitle="Tarikh susulan lepas"
        />
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
            ['overdue', 'Overdue'],
            ['semua', 'Semua'],
            ...CASE_STATUS_ORDER.map((s) => [s, CASE_STATUS_LABELS[s]] as const),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as FilterMode)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === key
                ? key === 'overdue'
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-primary-600 text-white shadow'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="mb-4 flex items-center gap-2 border-b border-neutral-100 pb-4">
          <ClipboardList className="text-primary-600" size={22} />
          <h2 className="text-lg font-black text-neutral-900">Senarai Kes ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            Tiada kes. Rekod intervensi dari{' '}
            <Link href="/gbk" className="font-semibold text-primary-600 underline">
              Pemantauan GBK
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  {['Murid', 'Kelas', 'Tarikh', 'Jenis', 'Objektif', 'Status', 'Susulan', 'Ringkasan', ''].map((h) => (
                    <th key={h || 'act'} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const overdue = isCaseOverdue(r.case_status, r.tarikh_susulan)
                  return (
                    <tr key={r.id} className={`hover:bg-neutral-50/80 align-top ${overdue ? 'bg-rose-50/40' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-neutral-900">
                        {r.student_name}
                        {overdue && (
                          <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{r.class_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{r.session_date}</td>
                      <td className="px-4 py-3 text-neutral-600 capitalize">{r.intervention_type || '—'}</td>
                      <td className="px-4 py-3 max-w-[180px] text-neutral-600 line-clamp-2">{r.objective || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex w-fit rounded-lg border px-2 py-1 text-xs font-bold ${caseStatusBadgeClass(r.case_status)}`}
                          >
                            {CASE_STATUS_LABELS[r.case_status]}
                          </span>
                          <select
                            value={r.case_status}
                            disabled={savingId === r.id}
                            onChange={(e) => openStatusModal(r, e.target.value as CaseStatus)}
                            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600"
                          >
                            {CASE_STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                Tukar → {CASE_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-600">
                        {r.tarikh_susulan || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] text-xs text-neutral-500 line-clamp-3">{r.summary || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => openInterventionPrint({
                              id: r.id,
                              student_name: r.student_name,
                              class_name: r.class_name,
                              session_date: r.session_date,
                              intervention_type: r.intervention_type,
                              objective: r.objective,
                              summary: r.summary,
                              follow_up_action: r.follow_up_action,
                              case_status: r.case_status,
                              tarikh_susulan: r.tarikh_susulan,
                              referral_to: r.referral_to,
                              counselor_name: r.counselor_name,
                            })}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            <Printer size={14} />
                            Cetak
                          </button>
                          <button
                            type="button"
                            onClick={() => openHistory(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            <History size={14} />
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {statusModalRow && (
        <StatusChangeModal
          open={!!statusModalRow}
          onClose={() => setStatusModalRow(null)}
          studentName={statusModalRow.student_name}
          fromStatus={statusModalRow.case_status}
          initialToStatus={statusModalTo}
          saving={savingId === statusModalRow.id}
          onConfirm={confirmStatusChange}
        />
      )}

      <ModalOverlay
        open={!!historyRow}
        onClose={() => setHistoryRow(null)}
        title="History status"
        subtitle={historyRow ? `${historyRow.student_name} · ${historyRow.session_date}` : ''}
        size="lg"
      >
        {historyLoading ? (
          <p className="py-8 text-center text-sm text-neutral-500">Memuatkan…</p>
        ) : historyLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            Belum ada perubahan status direkod. Tukar status untuk mula timeline.
          </p>
        ) : (
          <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
            {historyLogs.map((log) => (
              <li key={log.id} className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 text-sm">
                <p className="font-semibold text-neutral-800">
                  {formatStatusLogLine({
                    fromStatus: log.from_status,
                    toStatus: log.to_status,
                    createdAt: log.created_at,
                    counselorName: log.counselor_name,
                    nota: log.nota,
                  })}
                </p>
                {log.tarikh_susulan && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Tarikh susulan: <strong>{log.tarikh_susulan}</strong>
                  </p>
                )}
                {log.agensi_rujukan && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Rujukan: <strong>{log.agensi_rujukan}</strong>
                  </p>
                )}
                {log.nota && (
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">{log.nota}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </ModalOverlay>
    </PortalShell>
  )
}