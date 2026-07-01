'use client'

import { useRouter } from 'next/navigation'
import { PortalShell, StatCard } from '@/components/portal-shell'

export default function PentadbirPage() {
  const router = useRouter()
  return (
    <PortalShell title="Dashboard Pentadbir" subtitle="Ringkasan penggunaan sistem dan kawalan pentadbiran.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Jumlah Murid" value="1,248" icon="👥" tone="blue" />
        <StatCard label="Isi Refleksi Hari Ini" value="824" icon="📝" tone="green" />
        <StatCard label="Kes Aktif" value="18" icon="⚠️" tone="orange" />
        <StatCard label="Akses Diaudit" value="143" icon="🔐" tone="purple" />
      </div>
      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-gray-900">Modul Pentadbiran</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <button
            onClick={() => router.push('/pentadbir/upload-murid')}
            className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left font-medium text-blue-800 hover:bg-blue-100"
          >
            📤 Upload Murid (Excel)
          </button>
          {['Pengurusan Pengguna', 'Audit Log', 'Tetapan Sistem', 'Import Kehadiran', 'Laporan Bulanan', 'Export Data'].map((item) => (
            <button key={item} className="rounded-lg border border-gray-200 p-4 text-left font-medium text-gray-800 hover:bg-gray-50">{item}</button>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}
