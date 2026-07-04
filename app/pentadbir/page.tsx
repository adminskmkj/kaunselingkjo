'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'
import { Users, FileText, AlertTriangle, Shield, Upload, Wrench, ClipboardList, BarChart3, Database } from 'lucide-react'

type AuditRow = {
  id: string
  action: string
  actor_email: string | null
  created_at: string
}

type AdminStats = {
  totalMurid: number
  activeRisk: number
  todayCheckins: number
  totalProfiles: number
}

export default function PentadbirPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats>({ totalMurid: 0, activeRisk: 0, todayCheckins: 0, totalProfiles: 0 })
  const [recentAudit, setRecentAudit] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (profile.role !== 'admin') { router.push('/dashboard'); return }
    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading])

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const [muridRes, riskRes, checkinRes, auditRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('risk_levels').select('id', { count: 'exact', head: true }).eq('is_active', true).in('level', ['merah', 'jingga']),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('checkins').select('id', { count: 'exact', head: true }).eq('checkin_date', today),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('audit_logs').select('id, action, actor_email, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      setStats({
        totalMurid: muridRes.count ?? 0,
        activeRisk: riskRes.count ?? 0,
        todayCheckins: checkinRes.count ?? 0,
        totalProfiles: muridRes.count ?? 0,
      })

      setRecentAudit(auditRes.data ?? [])
    } catch (err) {
      console.error('Admin stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const modules = [
    { icon: Upload, label: 'Upload Murid (Excel)', path: '/pentadbir/upload-murid', featured: true },
    { icon: Users, label: 'Pengurusan Staff', path: '/pentadbir/staff', featured: false },
    { icon: Wrench, label: 'Repair Profiles', path: '/pentadbir/repair', featured: false },
    { icon: ClipboardList, label: 'Audit Log', path: '/pentadbir/audit', featured: false },
    { icon: BarChart3, label: 'Laporan Bulanan', path: '#', featured: false },
    { icon: Database, label: 'Export Data', path: '#', featured: false },
  ]

  if (authLoading || loading) {
    return (
      <PortalShell title="Dashboard Pentadbir">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Dashboard Pentadbir" subtitle="Pengurusan sistem, murid, dan kakitangan sekolah">
      {/* Real Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
        <StatCard label="Jumlah Murid" value={stats.totalMurid.toLocaleString('ms-MY')} icon={<Users size={22} />} tone="blue" subtitle="Terdaftar dalam sistem" />
        <StatCard label="Refleksi Hari Ini" value={stats.todayCheckins.toLocaleString('ms-MY')} icon={<FileText size={22} />} tone="green"
          subtitle={stats.totalMurid > 0 ? `${Math.round(stats.todayCheckins / stats.totalMurid * 100)}% daripada murid` : '-'} />
        <StatCard label="Kes Aktif (Risiko)" value={stats.activeRisk} icon={<AlertTriangle size={22} />} tone="orange" subtitle="Jingga + Merah" />
        <StatCard label="Log Audit Terkini" value={recentAudit.length} icon={<Shield size={22} />} tone="red" subtitle="5 log terakhir" />
      </div>

      {/* Modules */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Modul Pentadbiran</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon
            return (
            <button
              key={module.label}
              onClick={() => module.path !== '#' && router.push(module.path)}
              disabled={module.path === '#'}
              className={`rounded-2xl p-5 text-left font-semibold transition-all duration-200 ${
                module.featured
                  ? 'border-2 border-cyan-700 bg-cyan-700 text-white shadow-md hover:bg-cyan-800'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/50 disabled:cursor-not-allowed disabled:opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${module.featured ? 'bg-white/15' : 'bg-slate-100 text-cyan-700'}`}>
                  <Icon size={20} />
                </span>
                <span className="flex-1">{module.label}</span>
                {module.path !== '#' && !module.featured && (
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
            )
          })}
        </div>
      </div>

      <div className="card mb-8 border-l-4 border-l-indigo-500 bg-indigo-50/40">
        <h3 className="font-semibold text-neutral-900 mb-2">Portal Ibu Bapa</h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Web <strong>/ibu-bapa</strong> sudah wujud (Reach Out + ringkasan anak). Akaun ibu bapa perlu{' '}
          <strong>role = parent</strong> dalam Supabase, dan murid mesti ada <code className="text-xs bg-white px-1 rounded">parent_id</code>{' '}
          yang merujuk profil ibu bapa. Belum ada UI pautan automatik — set melalui SQL / Dashboard buat masa ini.
        </p>
      </div>

      {/* Audit log real data */}
      <div className="card">
        <h3 className="font-semibold text-neutral-900 mb-4">Log Audit Terkini</h3>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center">Tiada rekod audit.</p>
        ) : (
          <div className="space-y-3">
            {recentAudit.map((row) => (
              <div key={row.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{row.action}</p>
                  <p className="text-xs text-neutral-500">{row.actor_email ?? 'sistem'}</p>
                </div>
                <span className="text-xs text-neutral-400 flex-shrink-0">
                  {new Date(row.created_at).toLocaleString('ms-MY', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  )
}
