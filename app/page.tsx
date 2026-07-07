'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { GraduationCap, Compass, Backpack, Home as HomeIcon, ArrowRight } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const roles = [
    { icon: GraduationCap, title: 'Murid', desc: 'Rekod Perkembangan Murid', color: 'text-primary-700', bg: 'bg-primary-50', enabled: true },
    { icon: Compass, title: 'GBK', desc: 'Intervensi Bimbingan dan Kaunseling', color: 'text-accent-700', bg: 'bg-accent-50', enabled: true },
    { icon: Backpack, title: 'Guru', desc: 'Catatan Tingkah Laku & Kelas', color: 'text-violet-700', bg: 'bg-violet-50', enabled: false },
    { icon: HomeIcon, title: 'Ibu Bapa', desc: 'Pemantauan Rekod Perkembangan Murid', color: 'text-rose-700', bg: 'bg-rose-50', enabled: false },
  ]

  return (
    <div className="auth-shell flex flex-col items-center justify-center p-6 md:p-10">
      <div className="relative z-10 w-full max-w-5xl space-y-12 text-center">
        {/* Hero */}
        <div className="space-y-5">
          {/* Logo — circular glass badge */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/80 shadow-[0_8px_32px_rgba(47,111,95,0.15)] ring-1 ring-white/60 backdrop-blur-xl">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full">
              <Image src="/logo-sekolah.png" alt="Logo SK Mohd Khir Johari" width={76} height={76} className="object-contain" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 md:text-6xl" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              S.T.A.R KJo
            </h1>
            <p className="text-base font-semibold tracking-wide text-primary-700 md:text-lg" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Student Tracker Attitude Report
            </p>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-neutral-500 md:text-base">
              Sistem pemantauan tingkah laku dan intervensi awal murid SK Mohd Khir Johari
            </p>
          </div>
        </div>

        {/* CTA Button — premium gradient */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="btn-premium group"
          >
            <span>Log Masuk ke Sistem</span>
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => {
            const Icon = r.icon
            const target = r.enabled ? '/login' : '/coming-soon'
            return (
              <button
                key={r.title}
                type="button"
                onClick={() => router.push(target)}
                className={`group relative overflow-hidden rounded-3xl border bg-white/90 p-6 text-left shadow-soft backdrop-blur-sm transition-all duration-300 ${
                  r.enabled
                    ? 'border-neutral-100 hover:-translate-y-1 hover:shadow-[0_16px_40px_-8px_rgba(47,111,95,0.15)] hover:border-primary-200'
                    : 'border-neutral-100 opacity-70 hover:opacity-90'
                }`}
              >
                {/* Icon container */}
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${r.bg} ${r.color} ${!r.enabled ? 'grayscale' : ''} transition-transform duration-300 ${r.enabled ? 'group-hover:scale-110' : ''}`}>
                  <Icon size={24} strokeWidth={1.75} />
                </div>

                <h2 className="text-lg font-bold tracking-tight text-neutral-900" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  {r.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{r.desc}</p>

                {r.enabled && (
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Klik untuk log masuk
                    <ArrowRight size={12} />
                  </div>
                )}

                {!r.enabled && (
                  <span className="mt-4 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Coming Soon
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200/60 pt-8 text-sm text-neutral-400">
          <p className="font-medium text-neutral-500" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            STEM &amp; TVET : Pemacu Aspirasi Kerjaya Digital Generasi Madani
          </p>
          <p className="mt-1.5 text-xs text-neutral-400">SK Mohd Khir Johari · JBA1010</p>
        </footer>
      </div>
    </div>
  )
}
