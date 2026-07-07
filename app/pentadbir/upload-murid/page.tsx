'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PortalShell } from '@/components/portal-shell'

export default function AdminUploadMuridPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: number; message: string } | null>(null)

  if (profile?.role !== 'admin') {
    return (
      <PortalShell title="Akses Ditolak">
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⛔</span>
            <div>
              <p className="font-semibold text-red-900 mb-1">Akses Terhad</p>
              <p className="text-red-700">Hanya pentadbir boleh akses halaman ini.</p>
            </div>
          </div>
        </div>
      </PortalShell>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload-murid', {
        method: 'POST',
        headers: { 'x-admin-key': 'star-kjo-admin-2026' },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload gagal')
      }

      setResult({
        success: data.created + data.updated,
        errors: data.errors || 0,
        message: `✅ ${data.created} murid baru, ${data.updated} dikemaskini, ${data.errors || 0} ralat • 👪 ${data.guardians_synced ?? 0} rekod penjaga disegerakkan${data.guardian_errors ? ` (${data.guardian_errors} ralat penjaga)` : ''}`,
      })
    } catch (err) {
      setResult({
        success: 0,
        errors: 1,
        message: err instanceof Error ? err.message : 'Upload gagal',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <PortalShell title="Upload Murid dari Excel" subtitle="Import data murid dari fail Excel KPM (JBA1010)">
      <div className="max-w-3xl mx-auto">
        <div className="card">
          {/* Instructions */}
          <div className="mb-8 p-6 bg-primary-50 border-2 border-primary-200 rounded-xl">
            <h2 className="text-lg font-bold text-primary-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Langkah-langkah Upload
            </h2>
            <ol className="space-y-3 text-neutral-700">
              {[
                'Dapatkan Excel terkini dari sistem KPM (format JBA1010)',
                'Pilih fail Excel di bawah',
                'Klik Upload & Sync',
                'Tunggu proses selesai (murid baru akan dibuat, kelas akan dikemaskini)',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-neutral-700 mb-3">
              Pilih Fail Excel (.xlsx)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full px-4 py-3 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer
                  file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 
                  file:bg-primary-600 file:text-white file:font-medium file:cursor-pointer
                  hover:file:bg-primary-700 hover:border-primary-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              />
            </div>
            {file && (
              <div className="mt-3 p-3 bg-accent-50 border border-accent-200 rounded-lg flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{file.name}</p>
                  <p className="text-xs text-neutral-600">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-neutral-400 hover:text-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div
              className={`mb-6 p-4 rounded-xl border-2 ${
                result.errors > 0 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-accent-50 border-accent-200'
              }`}
            >
              <p className={`font-semibold ${result.errors > 0 ? 'text-yellow-900' : 'text-accent-900'}`}>
                {result.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary flex-1"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </span>
              ) : (
                '📤 Upload & Sync'
              )}
            </button>
            <button
              onClick={() => router.push('/pentadbir')}
              className="btn-secondary"
            >
              Batal
            </button>
          </div>

          {/* Important Notes */}
          <div className="mt-8 p-6 bg-neutral-50 border border-neutral-200 rounded-xl">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Nota Penting
            </h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              {[
                { icon: '📧', text: 'Murid login guna 12 digit IC + password sementara unik' },
                { icon: '🔑', text: 'Password sementara dijana semasa upload; cetak slip CSV dari output admin/CLI' },
                { icon: '⚠️', text: 'Murid yang tidak ada dalam Excel tidak akan didelete (safety)' },
                { icon: '⏱️', text: 'Proses mungkin ambil masa 1-3 minit untuk ratusan murid' },
              ].map((note, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">{note.icon}</span>
                  <span className="flex-1">{note.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
