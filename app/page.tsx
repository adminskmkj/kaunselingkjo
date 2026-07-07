'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { GraduationCap, Compass, Backpack, Home as HomeIcon, ArrowRight, Shield, Heart, TrendingUp } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const roles = [
    { icon: GraduationCap, title: 'Murid', desc: 'Rekod Perkembangan Murid', color: 'text-primary-700', bg: 'bg-primary-50', ring: 'ring-primary-100', enabled: true },
    { icon: Compass, title: 'GBK', desc: 'Intervensi Bimbingan dan Kaunseling', color: 'text-accent-700', bg: 'bg-accent-50', ring: 'ring-accent-100', enabled: true },
    { icon: Backpack, title: 'Guru', desc: 'Catatan Tingkah Laku & Kelas', color: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-100', enabled: false },
    { icon: HomeIcon, title: 'Ibu Bapa', desc: 'Pemantauan Rekod Perkembangan Murid', color: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-100', enabled: false },
  ]

  const features = [
    { icon: Shield, label: 'Pemantauan Risiko', desc: 'Sistem amaran awal 4 tahap' },
    { icon: Heart, label: 'Sokongan Emosi', desc: 'Refleksi harian 22 soalan' },
    { icon: TrendingUp, label: 'Laporan Analytics', desc: 'Trend & skor perkembangan' },
  ]

  return (
    <div className="auth-shell flex flex-col items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="relative z-10 w-full max-w-5xl">
        {/* Hero — split layout */}
        <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          {/* Left: text */}
          <div className="flex-1 text-center md:text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50/80 px-3 py-1 text-xs font-semibold text-primary-700 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-600"></span>
              </span>
              Sistem Aktif · JBA1010
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-neutral-900 md:text-5xl" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              S.T.A.R KJo
            </h1>
            <p className="mt-2 text-sm font-semibold tracking-wide text-primary-700 md:text-base" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Student Tracker Attitude Report
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500 md:text-[15px]">
              Sistem pemantauan tingkah laku dan intervensi awal murid SK Mohd Khir Johari
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="btn-premium group mt-5"
            >
              <span>Log Masuk ke Sistem</span>
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Right: logo glass badge */}
          <div className="flex shrink-0 items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary-200/30 blur-2xl"></div>
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/80 shadow-[0_12px_40px_rgba(47,111,95,0.18)] ring-1 ring-white/70 backdrop-blur-xl md:h-32 md:w-32">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full md:h-28 md:w-28">
                  <Image src="/logo-sekolah.png" alt="Logo SK Mohd Khir Johari" width={96} height={96} className="object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature strip */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white/70 p-3 backdrop-blur-sm md:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-neutral-800 md:text-sm" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>{f.label}</p>
                  <p className="truncate text-[10px] text-neutral-400 md:text-xs">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Portal Cards */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-800 md:text-xl" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Pilih Portal
            </h2>
            <span className="text-xs text-neutral-400">4 modul tersedia</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {roles.map((r) => {
              const Icon = r.icon
              const target = r.enabled ? '/login' : '/coming-soon'
              return (
                <button
                  key={r.title}
                  type="button"
                  onClick={() => router.push(target)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white/90 p-4 text-left shadow-soft backdrop-blur-sm transition-all duration-300 md:p-5 ${
                    r.enabled
                      ? `border-neutral-100 hover:-translate-y-1 hover:shadow-[0_16px_40px_-8px_rgba(47,111,95,0.15)] hover:${r.ring}`
                      : 'border-neutral-100 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Gradient accent on hover */}
                  {r.enabled && (
                    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${r.bg} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60`} />
                  )}

                  <div className={`relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${r.bg} ${r.color} ${!r.enabled ? 'grayscale' : ''} transition-transform duration-300 ${r.enabled ? 'group-hover:scale-110' : ''}`}>
                    <Icon size={22} strokeWidth={1.75} />
                  </div>

                  <h3 className="relative text-base font-bold tracking-tight text-neutral-900 md:text-lg" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                    {r.title}
                  </h3>
                  <p className="relative mt-1 text-xs leading-relaxed text-neutral-500 md:text-sm">{r.desc}</p>

                  {r.enabled && (
                    <div className="relative mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Log masuk
                      <ArrowRight size={11} />
                    </div>
                  )}

                  {!r.enabled && (
                    <span className="relative mt-3 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                      Coming Soon
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200/60 pt-5 text-center">
          <p className="text-xs font-semibold text-neutral-500 md:text-sm" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            STEM &amp; TVET : Pemacu Aspirasi Kerjaya Digital Generasi Madani
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">SK Mohd Khir Johari · JBA1010</p>
        </footer>
      </div>
    </div>
  )
}
