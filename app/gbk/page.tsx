'use client'

import { PortalShell, StatCard } from '@/components/portal-shell'
import { demoSessions, demoStudents, riskStyle } from '@/lib/demo-data'

export default function GBKDashboardPage() {
  const counts = {
    hijau: demoStudents.filter((s) => s.risk === 'hijau').length,
    kuning: demoStudents.filter((s) => s.risk === 'kuning').length,
    jingga: demoStudents.filter((s) => s.risk === 'jingga').length,
    merah: demoStudents.filter((s) => s.risk === 'merah').length,
  }

  return (
    <PortalShell title="Dashboard GBK" subtitle="Pemantauan risiko, intervensi awal dan sesi kaunseling.">
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Hijau" value={counts.hijau} icon="🟢" tone="green" />
        <StatCard label="Kuning" value={counts.kuning} icon="🟡" tone="orange" />
        <StatCard label="Jingga" value={counts.jingga} icon="🟠" tone="orange" />
        <StatCard label="Merah" value={counts.merah} icon="🔴" tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Murid Perlu Perhatian</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead><tr>{['Murid', 'Kelas', 'Skor', 'Trend', 'Risiko', 'Tindakan'].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-200">
                {demoStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.className}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{s.score}%</td>
                    <td className="px-4 py-3 text-gray-600">{s.trend}</td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${riskStyle[s.risk]}`}>{s.risk}</span></td>
                    <td className="px-4 py-3"><button className="rounded bg-blue-600 px-3 py-1 text-xs text-white">Intervensi</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Sesi Akan Datang</h2>
          <div className="space-y-3">
            {demoSessions.slice(0, 2).map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-100 p-3">
                <p className="font-semibold text-gray-900">{s.student}</p>
                <p className="text-sm text-gray-600">{s.date} • {s.time}</p>
                <p className="text-sm text-gray-500">{s.purpose}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  )
}
