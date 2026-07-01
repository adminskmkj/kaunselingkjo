'use client'

import { PortalShell, StatCard } from '@/components/portal-shell'
import { demoCheckins, demoBadges } from '@/lib/demo-data'

export default function IbuBapaPage() {
  return (
    <PortalShell title="Portal Ibu Bapa" subtitle="Paparan ringkas perkembangan anak. Nota dalaman guru/GBK tidak dipaparkan.">
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Skor Terkini" value="88%" icon="📊" tone="blue" />
        <StatCard label="Streak" value="7 hari" icon="🔥" tone="orange" />
        <StatCard label="Lencana" value={demoBadges.filter((b) => b.earned).length} icon="🏆" tone="purple" />
      </div>
      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Perkembangan Aiman Hakimi</h2>
        <div className="space-y-3">
          {demoCheckins.map((c) => (
            <div key={c.date} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
              <div><p className="font-semibold text-gray-900">{c.date}</p><p className="text-sm text-gray-600">Emosi: {c.emotion} • Stres: {c.stress}</p></div>
              <span className="font-bold text-blue-600">{c.score}%</span>
            </div>
          ))}
        </div>
      </section>
    </PortalShell>
  )
}
