'use client'

import { useState } from 'react'
import { PortalShell } from '@/components/portal-shell'
import { demoStudents, riskStyle } from '@/lib/demo-data'

export default function GuruDashboardPage() {
  const [saved, setSaved] = useState(false)
  return (
    <PortalShell title="Portal Guru" subtitle="Catatan guru, merit, aduan dan penghargaan murid.">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Senarai Murid</h2>
          <div className="space-y-3">
            {demoStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div><p className="font-semibold text-gray-900">{s.name}</p><p className="text-sm text-gray-600">{s.className} • Kehadiran {s.attendance}</p></div>
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${riskStyle[s.risk]}`}>{s.risk}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Tambah Rekod</h2>
          {saved && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">Rekod demo disimpan.</div>}
          <form onSubmit={(e) => { e.preventDefault(); setSaved(true) }} className="space-y-3">
            <select className="w-full rounded-lg border px-3 py-2"><option>Pilih murid</option>{demoStudents.map((s) => <option key={s.id}>{s.name}</option>)}</select>
            <select className="w-full rounded-lg border px-3 py-2"><option>Merit / Penghargaan</option><option>Aduan / Disiplin</option><option>Catatan Guru</option><option>Kokurikulum</option></select>
            <textarea rows={5} placeholder="Catatan ringkas..." className="w-full rounded-lg border px-3 py-2" />
            <button className="w-full rounded-lg bg-purple-600 py-2 font-medium text-white">Simpan Rekod</button>
          </form>
        </section>
      </div>
    </PortalShell>
  )
}
