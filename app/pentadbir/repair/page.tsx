'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PortalShell } from '@/components/portal-shell'
import { supabase } from '@/lib/supabase'
import { Loader2, ArrowLeft, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react'

type Orphan = {
  id: string
  email: string
  full_name: string
  role: string
}

export default function RepairPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [orphans, setOrphans] = useState<Orphan[]>([])
  const [loading, setLoading] = useState(true)
  const [repairing, setRepairing] = useState(false)
  const [result, setResult] = useState<{ fixed: number; skipped: number; errors: string[] } | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (profile.role !== 'admin') { router.push('/dashboard'); return }
    // ponytail: orphan detection via client — RLS allows admin to see all profiles
    checkOrphans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function checkOrphans() {
    try {
      // Get all profile IDs
      const { data: profiles } = await supabase.from('profiles').select('id')
      const profileIds = new Set((profiles || []).map((p: { id: string }) => p.id))

      // Can't list auth.users from client — use API proxy
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'admin' },
        body: JSON.stringify({ action: 'list_orphans' }),
      })

      // If API doesn't support list_orphans yet, just show empty state
      if (!res.ok) {
        setOrphans([])
        setLoading(false)
        return
      }

      const data = await res.json()
      setOrphans(data.orphans || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function repairAll() {
    setRepairing(true)
    setResult(null)
    try {
      // Call API to repair
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'admin' },
        body: JSON.stringify({ action: 'repair_orphans' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult({
        fixed: data.fixed || 0,
        skipped: data.skipped || 0,
        errors: data.errors || [],
      })
      await checkOrphans()
    } catch (e) {
      setResult({
        fixed: 0,
        skipped: 0,
        errors: [e instanceof Error ? e.message : 'Gagal'],
      })
    } finally {
      setRepairing(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Repair Profiles">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Repair Profiles" subtitle="Baiki akaun Auth yang tiada profil (orphan)">
      <button
        onClick={() => router.push('/pentadbir')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft size={14} /> Kembali ke Dashboard
      </button>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wrench size={20} className="text-amber-700" />
          <h2 className="text-sm font-black text-neutral-900">Repair Orphan Profiles</h2>
        </div>
        <p className="mb-4 text-xs text-neutral-600">
          Akaun Auth (auth.users) yang tiada row dalam <code className="rounded bg-neutral-100 px-1">profiles</code> akan
          menyebabkan login gagal dengan &quot;Profil tidak dijumpai&quot. Klik butang di bawah untuk baiki automatik.
        </p>

        {orphans.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold text-amber-800">
              <AlertTriangle size={14} className="mr-1 inline" />
              {orphans.length} akaun orphan ditemui
            </p>
            <ul className="space-y-1 text-xs text-neutral-600">
              {orphans.slice(0, 10).map((o) => (
                <li key={o.id} className="font-mono">{o.email}</li>
              ))}
              {orphans.length > 10 && <li>... dan {orphans.length - 10} lagi</li>}
            </ul>
          </div>
        )}

        <button onClick={repairAll} disabled={repairing} className="btn-primary text-sm">
          {repairing ? 'Membaiki...' : 'Baiki Semua Orphan'}
        </button>

        {result && (
          <div className="mt-4 space-y-2">
            {result.fixed > 0 && (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> {result.fixed} profil berjaya dibuat
              </p>
            )}
            {result.skipped > 0 && (
              <p className="text-sm font-semibold text-amber-700">{result.skipped} diabaikan (perlu manual)</p>
            )}
            {result.errors.length > 0 && (
              <ul className="text-xs text-rose-600">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
            {result.fixed === 0 && result.skipped === 0 && result.errors.length === 0 && (
              <p className="text-sm text-neutral-500">Tiada orphan ditemui. Semua akaun ada profil.</p>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  )
}
