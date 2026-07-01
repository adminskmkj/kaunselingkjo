'use client'

import { PortalShell } from '@/components/portal-shell'
import { demoBadges } from '@/lib/demo-data'

export default function LencanaPage() {
  return (
    <PortalShell title="Lencana Saya" subtitle="Ganjaran digital untuk tingkah laku positif dan konsisten.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {demoBadges.map((badge) => (
          <div key={badge.name} className={`rounded-lg border bg-white p-6 text-center shadow ${badge.earned ? 'border-yellow-200' : 'border-gray-200 opacity-60'}`}>
            <div className="mb-3 text-5xl">{badge.icon}</div>
            <h2 className="text-lg font-bold text-gray-900">{badge.name}</h2>
            <p className="mt-2 text-sm text-gray-600">{badge.description}</p>
            <span className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${badge.earned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {badge.earned ? 'Telah dicapai' : 'Belum dicapai'}
            </span>
          </div>
        ))}
      </div>
    </PortalShell>
  )
}
