'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react'

const SCHOOL_NAME = 'SK Mohd Khir Johari'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', h)
    return () => window.removeEventListener('mousemove', h)
  }, [])

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
    <div className="auth-shell relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
      {/* Mouse-follow blob */}
      <div
        className="pointer-events-none fixed z-0 h-96 w-96 rounded-full opacity-20 blur-[80px] transition-all duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(47,111,95,0.5), transparent 70%)',
          left: mousePos.x - 192,
          top: mousePos.y - 192,
        }}
      />

      <div className="animate-fade-up relative z-10 w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(47,111,95,0.2)]">
          {/* Logo + title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-neutral-100">
              <Image src="/logo-sekolah.png" alt="Logo" width={52} height={52} className="object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              S.T.A.R KJo
            </h1>
            <p className="mt-1 text-sm font-medium text-neutral-500">{SCHOOL_NAME}</p>
          </div>

          {/* Tab */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100/80 p-1">
            <span className="flex items-center justify-center rounded-xl bg-white py-2.5 text-sm font-bold text-primary-700 shadow-sm">
              Login
            </span>
            <Link href="/daftar-akaun" className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800">
              <UserPlus size={16} />
              Daftar
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold text-neutral-700">
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
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
                <b>Murid:</b> No. IC 12 digit · <b>GBK/Guru:</b> e-mel sekolah · <b>Ibu bapa:</b> e-mel daftar
              </p>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-neutral-700">
                Kata Laluan
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="Masukkan kata laluan"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  aria-label={showPwd ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan'}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-premium shine-sweep group flex w-full items-center justify-center gap-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sedang log masuk...
                </span>
              ) : (
                <>
                  <span>Log Masuk</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-neutral-400">
            Murid: No. KP 12 digit · Staff: e-mel sekolah · Ibu bapa: pilih <strong className="text-neutral-600">Daftar</strong>
          </p>
        </div>
      </div>
    </div>
  )
}