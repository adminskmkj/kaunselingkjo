'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { GraduationCap, Compass, Users, Home as HomeIcon, ArrowRight, Backpack } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const roles = [
    { icon: GraduationCap, title: 'Murid', desc: 'Rekod Perkembangan Murid', color: 'text-cyan-700 bg-cyan-50', enabled: true },
    { icon: Compass, title: 'GBK', desc: 'Intervensi Bimbingan dan Kaunseling', color: 'text-emerald-700 bg-emerald-50', enabled: true },
    { icon: Backpack, title: 'Guru', desc: 'Catatan Tingkah Laku & Kelas', color: 'text-violet-700 bg-violet-50', enabled: false },
    { icon: HomeIcon, title: 'Ibu Bapa', desc: 'Pemantauan Rekod Perkembangan Murid', color: 'text-amber-800 bg-amber-50', enabled: false },
  ]

  return (
    <div className="auth-shell flex flex-col items-center justify-center p-6 md:p-10">
      <div className="relative z-10 w-full max-w-4xl space-y-10 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg shadow-cyan-900/25 overflow-hidden">
            <Image src="/logo-sekolah.png" alt="Logo SK Mohd Khir Johari" width={72} height={72} className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">S.T.A.R KJo</h1>
          <p className="text-lg font-medium text-slate-600">Student Tracker Attitude Report</p>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
            Sistem pemantauan tingkah laku dan intervensi awal murid SK Mohd Khir Johari
          </p>
        </div>

        <button type="button" onClick={() => router.push('/login')} className="btn-primary inline-flex items-center gap-2 text-base">
          Log Masuk ke Sistem
          <ArrowRight size={18} />
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => {
            const Icon = r.icon
            const target = r.enabled ? '/login' : '/coming-soon'
            return (
              <button
                key={r.title}
                type="button"
                onClick={() => router.push(target)}
                className={`card relative text-left transition ${r.enabled ? 'hover:-translate-y-0.5' : 'opacity-60 hover:opacity-80'}`}
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${r.color} ${!r.enabled ? 'grayscale' : ''}`}>
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{r.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{r.desc}</p>
                {!r.enabled && (
                  <span className="mt-3 inline-block rounded-full bg-slate-200 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Coming Soon
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <footer className="border-t border-slate-200/80 pt-8 text-sm text-slate-500">
          <p className="font-medium text-slate-600">STEM & TVET : Pemacu Aspirasi Kerjaya Digital Generasi Madani</p>
          <p className="mt-1 text-xs">SK Mohd Khir Johari · JBA1010</p>
        </footer>
      </div>
    </div>
  )
}
