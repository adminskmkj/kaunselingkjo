'use client'

import { PortalShell } from '@/components/portal-shell'
import { demoSessions } from '@/lib/demo-data'

export default function SesiMuridPage() {
  return (
    <PortalShell title="Sesi Kaunseling" subtitle="Senarai permohonan dan sesi yang telah dijadualkan.">
      <div className="grid gap-4">
        {demoSessions.map((s) => (
          <div key={s.id} className="rounded-lg bg-white p-5 shadow">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="font-semibold text-gray-900">{s.date} • {s.time}</p>
                <p className="text-sm text-gray-600">{s.purpose}</p>
              </div>
              <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </PortalShell>
  )
}
