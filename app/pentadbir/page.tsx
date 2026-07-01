'use client'

import { useRouter } from 'next/navigation'
import { PortalShell, StatCard } from '@/components/portal-shell'

export default function PentadbirPage() {
  const router = useRouter()
  
  const modules = [
    { icon: '📤', label: 'Upload Murid (Excel)', path: '/pentadbir/upload-murid', featured: true },
    { icon: '👥', label: 'Pengurusan Pengguna', path: '#', featured: false },
    { icon: '📋', label: 'Audit Log', path: '#', featured: false },
    { icon: '⚙️', label: 'Tetapan Sistem', path: '#', featured: false },
    { icon: '📊', label: 'Import Kehadiran', path: '#', featured: false },
    { icon: '📈', label: 'Laporan Bulanan', path: '#', featured: false },
    { icon: '💾', label: 'Export Data', path: '#', featured: false },
  ]

  return (
    <PortalShell title="Dashboard Pentadbir" subtitle="Ringkasan penggunaan sistem dan kawalan pentadbiran">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
        <StatCard label="Jumlah Murid" value="1,248" icon="👥" tone="blue" subtitle="Aktif: 1,205" />
        <StatCard label="Refleksi Hari Ini" value="824" icon="📝" tone="green" subtitle="66% daripada aktif" />
        <StatCard label="Kes Aktif" value="18" icon="⚠️" tone="orange" subtitle="Memerlukan tindakan" />
        <StatCard label="Akses Diaudit" value="143" icon="🔐" tone="purple" subtitle="Log hari ini" />
      </div>

      {/* Modules */}
      <div className="card">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Modul Pentadbiran</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <button
              key={module.label}
              onClick={() => module.path !== '#' && router.push(module.path)}
              disabled={module.path === '#'}
              className={`
                p-5 rounded-xl text-left font-semibold transition-all duration-200
                ${module.featured 
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white hover:shadow-strong hover:scale-105 border-2 border-primary-600' 
                  : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`text-3xl ${module.featured ? '' : 'opacity-80'}`}>{module.icon}</span>
                <span className="flex-1">{module.label}</span>
                {module.featured && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <div className="card">
          <h3 className="font-semibold text-neutral-900 mb-4">Aktiviti Terkini</h3>
          <div className="space-y-3">
            {[
              { action: 'Upload murid dari Excel', user: 'Admin SMK KJ', time: '2 jam lalu' },
              { action: 'Export laporan bulanan', user: 'Pentadbir 1', time: '5 jam lalu' },
              { action: 'Kemaskini tetapan sistem', user: 'Admin SMK KJ', time: 'Semalam' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{activity.action}</p>
                  <p className="text-xs text-neutral-500">{activity.user}</p>
                </div>
                <span className="text-xs text-neutral-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-neutral-900 mb-4">Status Sistem</h3>
          <div className="space-y-3">
            {[
              { label: 'Database', status: 'Sihat', color: 'green' },
              { label: 'Backup Terakhir', status: '2 jam lalu', color: 'green' },
              { label: 'Storage', status: '68% digunakan', color: 'orange' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                <span className="text-sm font-medium text-neutral-700">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color === 'green' ? 'text-accent-600' : 'text-orange-600'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
