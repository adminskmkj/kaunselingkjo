'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowRight, CircleUserRound, HeartHandshake } from 'lucide-react'

const SCHOOL_NAME = 'SK Mohd Khir Johari'

export default function DaftarAkaunPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [childIc, setChildIc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const normalizeIc = (value: string) => value.replace(/\D/g, '').slice(0, 12)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const ic = normalizeIc(childIc)
    if (ic.length !== 12) {
      setError('No. IC anak mesti 12 digit.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'parent',
            full_name: fullName,
          },
        },
      })
      if (signUpError) throw signUpError

      setSuccess('Akaun ibu bapa berjaya didaftarkan.')

      if (data.session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: linkError } = await (supabase as any).rpc('link_child_to_parent_by_ic', { child_ic: ic })
        if (linkError) throw linkError
        setSuccess('Akaun berjaya. Anak sudah dipautkan. Sila ke dashboard ibu bapa.')
        router.push('/ibu-bapa')
      } else {
        setSuccess('Akaun berjaya didaftarkan. Sila sahkan e-mel, kemudian login dan paut anak di dashboard ibu bapa.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Daftar akaun gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell flex min-h-[100dvh] items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="card">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600 text-2xl font-bold text-white shadow-md">
              <HeartHandshake size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">S.T.A.R KJo</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">{SCHOOL_NAME}</p>
            <p className="mt-2 text-sm text-slate-500">Daftar akaun ibu bapa · masukkan No. IC anak</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <Link href="/login" className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <CircleUserRound size={16} />
              Login
            </Link>
            <span className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 pointer-events-none">
              Daftar
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nama Ibu / Bapa</label>
              <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Nama penuh" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">E-mel</label>
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="contoh@email.com" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Kata Laluan</label>
              <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">No. IC Anak 12 digit</label>
              <input className="input-field font-mono tracking-wider" value={childIc} onChange={(e) => setChildIc(normalizeIc(e.target.value))} required placeholder="080821011034" maxLength={12} inputMode="numeric" />
            </div>

            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
              {loading ? 'Mendaftar...' : 'Daftar Akaun'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
