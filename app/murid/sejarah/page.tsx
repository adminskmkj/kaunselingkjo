'use client'

import { PortalShell } from '@/components/portal-shell'
import { demoCheckins } from '@/lib/demo-data'

export default function SejarahRefleksiPage() {
  return (
    <PortalShell title="Sejarah Refleksi" subtitle="Rekod ringkas refleksi harian/mingguan murid.">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Tarikh', 'Skor', 'Emosi', 'Stres', 'Perlu Bantuan'].map((h) => <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {demoCheckins.map((row) => (
              <tr key={row.date}>
                <td className="px-6 py-4 text-sm text-gray-900">{row.date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-blue-600">{row.score}%</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.emotion}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.stress}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.help}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalShell>
  )
}
