'use client'

import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'

export default function ProfilMuridPage() {
  const { profile } = useAuth()
  return (
    <PortalShell title="Profil Murid" subtitle="Maklumat asas akaun murid.">
      <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
        <dl className="grid gap-4">
          <div><dt className="text-sm text-gray-500">Nama</dt><dd className="font-semibold text-gray-900">{profile?.full_name}</dd></div>
          <div><dt className="text-sm text-gray-500">Kelas</dt><dd className="font-semibold text-gray-900">{profile?.class_name}</dd></div>
          <div><dt className="text-sm text-gray-500">ID Murid</dt><dd className="font-semibold text-gray-900">{profile?.ic_or_student_id}</dd></div>
          <div><dt className="text-sm text-gray-500">Role</dt><dd className="font-semibold text-gray-900">{profile?.role}</dd></div>
        </dl>
        <button className="mt-6 rounded-lg bg-primary-600 px-5 py-2 font-medium text-white hover:bg-primary-700">Tukar Kata Laluan</button>
      </div>
    </PortalShell>
  )
}
