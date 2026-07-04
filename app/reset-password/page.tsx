'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type ProfileUpdateClient = {
  from: (table: string) => {
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>
    }
  }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const { profile, loading, refreshProfile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Kata laluan baharu mesti sekurang-kurangnya 8 aksara.')
      return
    }
    if (password !== confirm) {
      setError('Kata laluan tidak sepadan.')
      return
    }
    if (!profile) {
      setError('Sesi tidak sah. Sila login semula.')
      return
    }

    setSaving(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError

      const { error: profileError } = await (supabase as unknown as ProfileUpdateClient)
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', profile.id)

      if (profileError) throw profileError

      await refreshProfile()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menukar kata laluan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuatkan...</div>
  }

  if (!profile) {
    router.push('/login')
    return null
  }

  return (
    <div className="auth-shell flex min-h-[100dvh] items-center justify-center p-4">
      <div className="relative z-10 card w-full max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Tukar Kata Laluan</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Ini login pertama anda. Sila tetapkan kata laluan peribadi sebelum masuk sistem.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Kata Laluan Baharu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              minLength={8}
              required
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Sahkan Kata Laluan</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
              minLength={8}
              required
              disabled={saving}
            />
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Kata Laluan'}
          </button>
        </form>
      </div>
    </div>
  )
}
