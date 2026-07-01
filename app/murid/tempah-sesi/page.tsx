'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'

export default function TempahSesiPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)

  return (
    <PortalShell title="Tempah Sesi Kaunseling" subtitle="Pilih masa sesuai dan nyatakan tujuan ringkas.">
      <form onSubmit={(e) => { e.preventDefault(); setSaved(true); setTimeout(() => router.push('/murid/sesi'), 1200) }} className="max-w-2xl rounded-lg bg-white p-6 shadow">
        {saved && <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">Permohonan sesi telah direkodkan (demo).</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">Tarikh
            <input type="date" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-gray-700">Masa
            <input type="time" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-gray-700">Tujuan
          <textarea required rows={5} placeholder="Contoh: Saya ingin berbincang tentang motivasi belajar..." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <button className="mt-6 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700">Hantar Permohonan</button>
      </form>
    </PortalShell>
  )
}
