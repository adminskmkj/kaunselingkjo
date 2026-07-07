'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function ComingSoonPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <video
          src="/comingsoon.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="mx-auto w-full rounded-2xl shadow-2xl"
        />
        <h1 className="text-2xl font-bold text-white">Coming Soon</h1>
        <p className="text-sm text-slate-400">Modul ini sedang dalam pembangunan. Sila kembali kemudian.</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Kembali ke Menu Utama
        </button>
      </div>
    </div>
  )
}
