'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function Home() {
  const router = useRouter()
  const { demoSignIn } = useAuth()
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [lockPassword, setLockPassword] = useState('')
  const [lockError, setLockError] = useState('')

  const handleLockSubmit = () => {
    if (lockPassword === 'admin2026') {
      demoSignIn('admin')
      router.push('/dashboard')
    } else {
      setLockError('Kata laluan salah')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20">
      {/* Admin Lock Button — top right */}
      <button
        onClick={() => { setShowLockDialog(true); setLockError(''); setLockPassword('') }}
        className="fixed top-4 right-4 w-12 h-12 rounded-full bg-neutral-900 shadow-strong border-2 border-yellow-500 flex items-center justify-center text-yellow-500 hover:scale-110 hover:shadow-xl transition-all duration-200 z-50"
        title="Akses Pentadbir"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </button>

      {/* Lock Dialog */}
      {showLockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLockDialog(false)}>
          <div className="bg-white rounded-2xl shadow-strong p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-900 border-2 border-yellow-500 text-yellow-500 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">Akses Pentadbir</h2>
              <p className="text-sm text-neutral-600">Masukkan kata laluan pentadbir</p>
            </div>

            <input
              type="password"
              placeholder="Kata laluan"
              value={lockPassword}
              onChange={(e) => { setLockPassword(e.target.value); setLockError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleLockSubmit()}
              className="input-field mb-3"
              autoFocus
            />

            {lockError && (
              <p className="text-sm text-red-600 mb-3 text-center">{lockError}</p>
            )}

            <button onClick={handleLockSubmit} className="btn-primary w-full">
              Buka Kunci
            </button>

            <button
              onClick={() => setShowLockDialog(false)}
              className="w-full text-center text-sm text-neutral-500 mt-3 hover:text-neutral-700"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="text-center space-y-8 max-w-4xl">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-4xl shadow-strong mb-4">
          S
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-neutral-900 tracking-tight">
            S.T.A.R KJo
          </h1>
          <p className="text-2xl font-semibold text-neutral-700">
            Student Tracker Attitude Report
          </p>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Sistem pemantauan tingkah laku dan intervensi awal murid SMK Kampung Jawa
          </p>
        </div>
        
        {/* CTA */}
        <div className="pt-6">
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-all duration-200 shadow-strong hover:shadow-xl hover:scale-105"
          >
            Log Masuk ke Sistem
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          <div className="card group hover:shadow-strong transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👨‍🎓
            </div>
            <h2 className="text-xl font-bold text-primary-600 mb-2">Murid</h2>
            <p className="text-sm text-neutral-600">Refleksi harian & lihat perkembangan diri</p>
          </div>
          
          <div className="card group hover:shadow-strong transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👨‍💼
            </div>
            <h2 className="text-xl font-bold text-accent-600 mb-2">GBK</h2>
            <p className="text-sm text-neutral-600">Dashboard intervensi & pemantauan risiko</p>
          </div>
          
          <div className="card group hover:shadow-strong transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👨‍🏫
            </div>
            <h2 className="text-xl font-bold text-purple-600 mb-2">Guru</h2>
            <p className="text-sm text-neutral-600">Catatan tingkah laku & pantau kelas</p>
          </div>
          
          <div className="card group hover:shadow-strong transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👨‍👩‍👧
            </div>
            <h2 className="text-xl font-bold text-orange-600 mb-2">Ibu Bapa</h2>
            <p className="text-sm text-neutral-600">Lihat perkembangan anak anda</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-neutral-200">
          <p className="text-sm text-neutral-600 font-medium">
            🎯 STEM & TVET : PEMACU ASPIRASI KERJAYA DIGITAL GENERASI MADANI
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            SMK Kampung Jawa • JBA1010
          </p>
        </div>
      </div>
    </div>
  )
}
