'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, UserPlus } from 'lucide-react'

const SCHOOL_NAME = 'SK Mohd Khir Johari'

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Log masuk gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell flex min-h-[100dvh] items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="card">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-700 text-2xl font-bold text-white shadow-md">
              S
            </div>
            <h1 className="text-2xl font-bold text-slate-900">S.T.A.R KJo</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">{SCHOOL_NAME}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <span className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 pointer-events-none">
              Login
            </span>
            <Link href="/daftar-akaun" className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <UserPlus size={16} />
              Daftar
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-slate-700">
                No. Kad Pengenalan / E-mel
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-field"
                placeholder="12 digit IC atau e-mel staff"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Kata Laluan
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
              {loading ? 'Sedang log masuk...' : 'Log Masuk'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Murid: No. KP 12 digit · Staff: e-mel sekolah · Ibu bapa: pilih <strong>Daftar</strong>
          </p>
        </div>
      </div>
    </div>
  )
}