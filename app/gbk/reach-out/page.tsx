'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'
import {
  REACH_OUT_SOURCE_LABELS,
  REACH_OUT_STATUS_LABELS,
  ReachOutSource,
  ReachOutStatus,
  reachOutStatusClass,
} from '@/lib/reach-out-status'
import { ArrowLeft, Inbox, MessageSquare } from 'lucide-react'

type Row = {
  id: string
  student_id: string
  message: string
  source: ReachOutSource
  status: ReachOutStatus
  reply_message: string | null
  replied_at: string | null
  created_at: string
  student_name: string
  class_name: string | null
}

export default function GBKReachOutPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'baru' | 'semua'>('baru')

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
    fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchRows() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('reach_out_messages')
        .select('id, student_id, message, source, status, reply_message, replied_at, created_at')
        .order('created_at', { ascending: false })
        .limit(150)

      if (error) throw error

      const raw = (data || []) as Omit<Row, 'student_name' | 'class_name'>[]
      const ids = [...new Set(raw.map((r) => r.student_id))]
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, class_name').in('id', ids)
      type P = { id: string; full_name: string; class_name: string | null }
      const pmap = new Map((profiles as P[] | null)?.map((p) => [p.id, p]) || [])

      setRows(
        raw.map((r) => ({
          ...r,
          source: r.source as ReachOutSource,
          status: r.status as ReachOutStatus,
          student_name: pmap.get(r.student_id)?.full_name || '—',
          class_name: pmap.get(r.student_id)?.class_name ?? null,
        }))
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'semua') return rows
    return rows.filter((r) => r.status === 'baru' || r.status === 'dibaca')
  }, [rows, filter])

  const selected = rows.find((r) => r.id === selectedId) || null
  const baruCount = rows.filter((r) => r.status === 'baru').length

  async function markDibaca(id: string) {
    const row = rows.find((r) => r.id === id)
    if (!row || row.status !== 'baru') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('reach_out_messages').update({ status: 'dibaca' }).eq('id', id)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'dibaca' } : r)))
  }

  function selectRow(id: string) {
    setSelectedId(id)
    setReply('')
    void markDibaca(id)
  }

  async function sendReply() {
    if (!selected || !profile || !reply.trim()) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('reach_out_messages')
        .update({
          reply_message: reply.trim(),
          replied_at: new Date().toISOString(),
          counselor_id: profile.id,
          status: 'dijawab',
        })
        .eq('id', selected.id)

      if (error) throw error
      await fetchRows()
      setReply('')
      alert('Balasan dihantar.')
    } catch (e) {
      console.error(e)
      alert('Gagal hantar balasan. Pastikan migration 012 dah apply.')
    } finally {
      setSaving(false)
    }
  }

  async function closeThread() {
    if (!selected) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('reach_out_messages')
        .update({ status: 'ditutup' })
        .eq('id', selected.id)
      if (error) throw error
      await fetchRows()
      setSelectedId(null)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Reach Out Inbox">
        <div className="flex justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Reach Out Inbox" subtitle="Mesej murid, ibu bapa & isyarat refleksi (q10)">
      <div className="mb-6">
        <Link
          href="/gbk"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Pemantauan GBK
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Baru" value={baruCount} icon={<Inbox size={22} />} tone="red" subtitle="Perlu tindakan" />
        <StatCard label="Jumlah" value={rows.length} icon={<MessageSquare size={22} />} tone="blue" subtitle="Semua thread" />
      </div>

      <div className="mb-4 flex gap-2">
        {(['baru', 'semua'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              filter === f ? 'bg-cyan-700 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {f === 'baru' ? 'Aktif (Baru/Dibaca)' : 'Semua'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-2 max-h-[70vh] overflow-y-auto">
          <div className="mb-3 flex items-center gap-2">
            <Inbox size={20} className="text-primary-600" />
            <h2 className="font-black text-slate-900">Senarai ({filtered.length})</h2>
          </div>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Tiada mesej.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectRow(r.id)}
                    className={`w-full px-3 py-3 text-left transition hover:bg-slate-50 ${
                      selectedId === r.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900">{r.student_name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${reachOutStatusClass(r.status)}`}>
                        {REACH_OUT_STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{r.class_name || '—'} · {REACH_OUT_SOURCE_LABELS[r.source]}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-3">
          {!selected ? (
            <p className="py-16 text-center text-sm text-slate-500">Pilih mesej untuk baca & balas.</p>
          ) : (
            <>
              <div className="mb-4 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900">{selected.student_name}</h3>
                <p className="text-sm text-slate-500">
                  {selected.class_name} · {new Date(selected.created_at).toLocaleString('ms-MY')}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{selected.message}</p>
              </div>
              {selected.reply_message && (
                <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="text-xs font-bold uppercase text-emerald-700">Balasan anda</p>
                  <p className="mt-1 whitespace-pre-wrap">{selected.reply_message}</p>
                </div>
              )}
              {selected.status !== 'ditutup' && (
                <>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Balas murid</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="input min-h-[120px]"
                    placeholder="Mesej ringkas untuk murid (akan nampak di portal murid)..."
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={sendReply} disabled={saving || !reply.trim()} className="btn-primary">
                      {saving ? 'Menghantar...' : 'Hantar Balasan'}
                    </button>
                    <button type="button" onClick={closeThread} disabled={saving} className="btn-secondary">
                      Tutup Thread
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </PortalShell>
  )
}