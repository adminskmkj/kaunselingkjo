'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(identifier, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Sila cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-3xl shadow-strong mb-4">
            S
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">S.T.A.R KJo</h1>
          <p className="text-neutral-600 font-medium">Student Tracker Attitude Report</p>
          <p className="text-sm text-neutral-500 mt-1">Sistem Pemantauan Tingkah Laku Murid</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-neutral-700 mb-2">
                IC (Murid) / Email (Guru)
              </label>
              <input
                id="identifier"
                type="text"
                placeholder="200106070282"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-field"
                required
                disabled={loading}
              />
              <p className="text-xs text-neutral-500 mt-2">
                <span className="font-medium">Murid:</span> 12 digit IC &nbsp;|&nbsp; <span className="font-medium">Guru/GBK:</span> Email sekolah
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                Kata Laluan
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-red-600 text-lg">⚠️</span>
                <p className="text-sm text-red-700 flex-1">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memasuki...
                </span>
              ) : (
                'Log Masuk'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              ← Kembali ke halaman utama
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">
            Untuk bantuan, hubungi pentadbir sekolah
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            SMK Kampung Jawa • Sistem S.T.A.R
          </p>
        </div>
      </div>
    </div>
  )
}
