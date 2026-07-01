'use client'

import { PortalShell, StatCard } from '@/components/portal-shell'
import { demoSessions, demoStudents } from '@/lib/demo-data'

export default function GBKDashboardPage() {
  const counts = {
    hijau: demoStudents.filter((s) => s.risk === 'hijau').length,
    kuning: demoStudents.filter((s) => s.risk === 'kuning').length,
    jingga: demoStudents.filter((s) => s.risk === 'jingga').length,
    merah: demoStudents.filter((s) => s.risk === 'merah').length,
  }

  const riskBadges: Record<string, { bg: string; text: string; border: string }> = {
    hijau: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200' },
    kuning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    jingga: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    merah: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  }

  return (
    <PortalShell title="Dashboard GBK" subtitle="Pemantauan risiko, intervensi awal dan sesi kaunseling">
      {/* Risk Level Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Hijau (Stabil)" value={counts.hijau} icon="🟢" tone="green" subtitle="Tiada risiko" />
        <StatCard label="Kuning (Awas)" value={counts.kuning} icon="🟡" tone="orange" subtitle="Perlu pantau" />
        <StatCard label="Jingga (Risiko)" value={counts.jingga} icon="🟠" tone="orange" subtitle="Perlu tindakan" />
        <StatCard label="Merah (Kritikal)" value={counts.merah} icon="🔴" tone="red" subtitle="Segera" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Students Table */}
        <section className="lg:col-span-2 card">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Murid Perlu Perhatian</h2>
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  {['Murid', 'Kelas', 'Skor', 'Trend', 'Risiko', 'Tindakan'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {demoStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{s.className}</td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-primary-600">{s.score}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${s.trend.startsWith('+') ? 'text-accent-600' : 'text-red-600'}`}>
                        {s.trend}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${riskBadges[s.risk].bg} ${riskBadges[s.risk].text} ${riskBadges[s.risk].border}`}>
                        {s.risk.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="btn-primary text-xs py-2 px-4">
                        Intervensi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Upcoming Sessions */}
        <section className="card">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Sesi Akan Datang</h2>
          <div className="space-y-3">
            {demoSessions.slice(0, 3).map((s) => (
              <div key={s.id} className="p-4 rounded-xl border-2 border-neutral-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-neutral-900">{s.student}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700">
                    {s.status}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mb-1">
                  📅 {s.date} • ⏰ {s.time}
                </p>
                <p className="text-sm text-neutral-500">{s.purpose}</p>
              </div>
            ))}
          </div>
          <button className="btn-secondary w-full mt-4">
            Lihat Semua Sesi
          </button>
        </section>
      </div>
    </PortalShell>
  )
}
