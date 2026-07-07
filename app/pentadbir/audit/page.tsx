'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PortalShell } from '@/components/portal-shell'
import { supabase } from '@/lib/supabase'
import { Loader2, ArrowLeft, Shield, Search } from 'lucide-react'

type AuditRow = {
  id: string
  action: string
  user_id: string
  target_student_id: string | null
  ip_address: string | null
  timestamp: string
  actor_name?: string
  target_name?: string
}

export default function AuditPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (profile.role !== 'admin') { router.push('/dashboard'); return }
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile, limit])

  async function fetchLogs() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('audit_logs')
        .select('id, action, user_id, target_student_id, ip_address, timestamp')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Fetch actor + target names
      const rows = (data || []) as AuditRow[]
      const userIds = new Set<string>()
      rows.forEach((r) => {
        if (r.user_id) userIds.add(r.user_id)
        if (r.target_student_id) userIds.add(r.target_student_id)
      })

      if (userIds.size > 0) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds))
        const nameMap = new Map((prof || []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]))
        rows.forEach((r) => {
          r.actor_name = nameMap.get(r.user_id) || '—'
          r.target_name = r.target_student_id ? (nameMap.get(r.target_student_id) || '—') : undefined
        })
      }

      setLogs(rows)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = search
    ? logs.filter(
        (l) =>
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          (l.actor_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (l.target_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs

  if (authLoading || loading) {
    return (
      <PortalShell title="Log Audit">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Log Audit" subtitle="Rekod akses & tindakan dalam sistem">
      <button
        onClick={() => router.push('/pentadbir')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} /> Kembali ke Dashboard
      </button>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tindakan, nama..."
            className="input pl-9 text-sm"
          />
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="input text-sm"
        >
          <option value={50}>50 terkini</option>
          <option value={100}>100 terkini</option>
          <option value={500}>500 terkini</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="mb-3 flex items-center gap-2">
          <Shield size={18} className="text-primary-700" />
          <h2 className="text-sm font-black text-slate-900">{filtered.length} rekod</h2>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Tiada log audit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left font-bold uppercase text-slate-500">
                  <th className="py-2 pr-3">Masa</th>
                  <th className="py-2 pr-3">Tindakan</th>
                  <th className="py-2 pr-3">Pelaku</th>
                  <th className="py-2 pr-3">Sasaran</th>
                  <th className="py-2 pr-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('ms-MY', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{l.action}</td>
                    <td className="py-2 pr-3 text-slate-600">{l.actor_name || '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{l.target_name || '—'}</td>
                    <td className="py-2 pr-3 text-slate-400 font-mono">{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  )
}
