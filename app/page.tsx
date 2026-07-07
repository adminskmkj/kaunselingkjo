'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { GraduationCap, Compass, Backpack, Home as HomeIcon, ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const roles = [
    { icon: GraduationCap, title: 'Murid', desc: 'Rekod Perkembangan Murid', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'hover:border-emerald-200', enabled: true },
    { icon: Compass, title: 'GBK', desc: 'Intervensi Bimbingan dan Kaunseling', color: 'text-amber-700', bg: 'bg-amber-50', border: 'hover:border-amber-200', enabled: true },
    { icon: Backpack, title: 'Guru', desc: 'Catatan Tingkah Laku dan Kelas', color: 'text-violet-700', bg: 'bg-violet-50', border: 'hover:border-violet-200', enabled: false },
    { icon: HomeIcon, title: 'Ibu Bapa', desc: 'Pemantauan Rekod Perkembangan Murid', color: 'text-rose-700', bg: 'bg-rose-50', border: 'hover:border-rose-200', enabled: false },
  ]

  return (
    <div className="auth-shell flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <main className="relative z-10 w-full max-w-4xl">
        {/* Hero — compact inline */}
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-neutral-100">
              <Image src="/logo-sekolah.png" alt="Logo SK Mohd Khir Johari" width={52} height={52} className="object-contain" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-extrabold leading-none tracking-tight text-neutral-900 sm:text-4xl" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                S.T.A.R KJo
              </h1>
              <p className="mt-1 text-xs font-semibold text-primary-600 sm:text-sm" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                Student Tracker Attitude Report
              </p>
            </div>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-neutral-500">
            Sistem pemantauan tingkah laku dan intervensi awal murid SK Mohd Khir Johari
          </p>

          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="btn-premium group w-full sm:w-auto"
              aria-label="Log masuk ke sistem"
            >
              <span>Log Masuk ke Sistem</span>
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400">
              <Sparkles size={13} className="text-amber-500" aria-hidden="true" />
              JBA1010 · SK Mohd Khir Johari
            </span>
          </div>
        </header>

        {/* Portal cards */}
        <section aria-label="Pilihan portal pengguna">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {roles.map((r) => {
              const Icon = r.icon
              const target = r.enabled ? '/login' : '/coming-soon'
              return (
                <button
                  key={r.title}
                  type="button"
                  onClick={() => router.push(target)}
                  aria-label={`Portal ${r.title}${r.enabled ? '' : ' (Coming Soon)'}`}
                  className={`group flex flex-col rounded-2xl border border-neutral-100 bg-white p-4 text-left shadow-soft transition-all duration-200 sm:p-5 ${
                    r.enabled
                      ? `hover:-translate-y-1 hover:shadow-medium ${r.border}`
                      : 'opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${r.bg} ${r.color} ${!r.enabled ? 'grayscale' : ''} transition-transform duration-200 group-hover:scale-110`}>
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-bold tracking-tight text-neutral-900 sm:text-base" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                    {r.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">{r.desc}</p>

                  {r.enabled ? (
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600">
                      Log masuk <ArrowRight size={11} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex w-fit items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                      Coming Soon
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-neutral-200/60 pt-5 text-center">
          <p className="text-xs font-semibold text-neutral-500" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            STEM &amp; TVET : Pemacu Aspirasi Kerjaya Digital Generasi Madani
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">SK Mohd Khir Johari · JBA1010</p>
        </footer>
      </main>
    </div>
  )
}
