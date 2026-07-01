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
      <PortalShell title="Access Denied">
        <div className="rounded-lg bg-red-50 p-6 text-red-700">
          Hanya pentadbir boleh akses halaman ini.
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
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload gagal')
      }

      setResult({
        success: data.created + data.updated,
        errors: data.errors || 0,
        message: `✅ ${data.created} murid baru, ${data.updated} dikemaskini, ${data.errors || 0} ralat`,
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
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow">
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Langkah-langkah:</h2>
          <ol className="list-decimal space-y-2 pl-5 text-gray-700">
            <li>Dapatkan Excel terkini dari sistem KPM (format JBA1010)</li>
            <li>Pilih fail Excel di bawah</li>
            <li>Klik <strong>Upload & Sync</strong></li>
            <li>Tunggu proses selesai (murid baru akan dibuat, kelas akan dikemaskini)</li>
          </ol>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Pilih Fail Excel (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full rounded-lg border border-gray-300 p-3 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Fail dipilih: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {result && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              result.errors > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'
            }`}
          >
            <p className="font-medium">{result.message}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Memproses...' : 'Upload & Sync'}
          </button>
          <button
            onClick={() => router.push('/pentadbir')}
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="mb-2 font-medium">Nota Penting:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Murid baru akan dapat email: <code className="rounded bg-gray-200 px-1">{'{6_digit_ic}@student.smkkj.edu.my'}</code></li>
            <li>Password default: <code className="rounded bg-gray-200 px-1">skmkj@1010.murid1234</code></li>
            <li>Murid mesti tukar password pada login pertama</li>
            <li>Murid yang tidak ada dalam Excel <strong>tidak akan didelete</strong> (safety)</li>
            <li>Proses mungkin ambil masa 1-3 minit untuk ratusan murid</li>
          </ul>
        </div>
      </div>
    </PortalShell>
  )
}
