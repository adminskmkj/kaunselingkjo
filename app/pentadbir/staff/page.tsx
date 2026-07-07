'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PortalShell } from '@/components/portal-shell'
import { supabase } from '@/lib/supabase'
import { UserPlus, KeyRound, Trash2, Loader2, ArrowLeft } from 'lucide-react'

type StaffRow = {
  id: string
  email: string
  full_name: string
  role: string
  class_name: string | null
  must_change_password: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  counselor: 'GBK',
  class_teacher: 'Guru Kelas',
  discipline_teacher: 'Guru Disiplin',
  admin: 'Pentadbir',
}

const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'star-kjo-admin-2026'

export default function StaffPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'counselor', class_name: '' })
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (profile.role !== 'admin') { router.push('/dashboard'); return }
    fetchStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchStaff() {
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_API_KEY },
        body: JSON.stringify({ action: 'list' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStaff(data.staff || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function createStaff() {
    setCreating(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_API_KEY },
        body: JSON.stringify({
          action: 'create',
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          class_name: form.class_name || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult({
        type: 'ok',
        text: `Berjaya! Password sementara: ${data.password}`,
      })
      setForm({ email: '', full_name: '', role: 'counselor', class_name: '' })
      setShowForm(false)
      await fetchStaff()
    } catch (e) {
      setResult({ type: 'err', text: e instanceof Error ? e.message : 'Gagal' })
    } finally {
      setCreating(false)
    }
  }

  async function resetPassword(id: string) {
    setActionId(id)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_API_KEY },
        body: JSON.stringify({ action: 'reset_password', user_id: id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(`Password baru: ${data.password}`)
    } catch (e) {
      alert('Gagal reset: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setActionId(null)
    }
  }

  async function deleteStaff(id: string, name: string) {
    if (!confirm(`Padam akaun ${name}? Tidak boleh buang.`)) return
    setActionId(id)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_API_KEY },
        body: JSON.stringify({ action: 'delete', user_id: id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await fetchStaff()
    } catch (e) {
      alert('Gagal padam: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setActionId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Pengurusan Staff">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Pengurusan Staff" subtitle="Cipta akaun GBK, Guru, Pentadbir — reset password">
      <button
        onClick={() => router.push('/pentadbir')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} /> Kembali ke Dashboard
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Senarai Staff ({staff.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <UserPlus size={16} /> Tambah Staff
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5">
          <h3 className="mb-4 text-sm font-black text-slate-900">Akaun Staff Baru</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="gbk@skmkj.edu.my"
                className="input mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Nama Penuh</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Pn. Aisyah Binti Rahman"
                className="input mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Peranan</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input mt-1 text-sm"
              >
                <option value="counselor">GBK (Guru Bimbingan & Kaunseling)</option>
                <option value="class_teacher">Guru Kelas</option>
                <option value="discipline_teacher">Guru Disiplin</option>
                <option value="admin">Pentadbir</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Kelas (opsyenal)</label>
              <input
                type="text"
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                placeholder="TAHUN LIMA · AL-RAZI"
                className="input mt-1 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={createStaff}
              disabled={creating || !form.email || !form.full_name}
              className="btn-primary text-sm"
            >
              {creating ? 'Menyimpan...' : 'Cipta Akaun'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">
              Batal
            </button>
          </div>
          {result && (
            <p className={`mt-3 text-sm font-semibold ${result.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {result.text}
            </p>
          )}
        </div>
      )}

      {staff.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">Tiada staff berdaftar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Peranan</th>
                <th className="py-3 pr-4">Kelas</th>
                <th className="py-3 pr-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{s.full_name}</td>
                  <td className="py-3 pr-4 text-slate-600">{s.email}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {ROLE_LABELS[s.role] || s.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{s.class_name || '—'}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => resetPassword(s.id)}
                        disabled={actionId === s.id}
                        title="Reset Password"
                        className="rounded-lg bg-amber-50 p-2 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() => deleteStaff(s.id, s.full_name)}
                        disabled={actionId === s.id}
                        title="Padam"
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  )
}
