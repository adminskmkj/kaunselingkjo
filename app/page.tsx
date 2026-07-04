'use client'

import { useRouter } from 'next/navigation'
import { GraduationCap, Compass, Users, Home as HomeIcon, ArrowRight } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const roles = [
    { icon: GraduationCap, title: 'Murid', desc: 'Refleksi harian & perkembangan diri', color: 'text-cyan-700 bg-cyan-50' },
    { icon: Compass, title: 'GBK', desc: 'Intervensi awal & pemantauan risiko', color: 'text-emerald-700 bg-emerald-50' },
    { icon: Users, title: 'Guru', desc: 'Catatan tingkah laku & kelas', color: 'text-slate-700 bg-slate-100' },
    { icon: HomeIcon, title: 'Ibu Bapa', desc: 'Pantau perkembangan anak', color: 'text-amber-800 bg-amber-50' },
  ]

  return (
    <div className="auth-shell flex flex-col items-center justify-center p-6 md:p-10">
      <div className="relative z-10 w-full max-w-4xl space-y-10 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-700 text-3xl font-bold text-white shadow-lg shadow-cyan-900/25">
            S
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">S.T.A.R KJo</h1>
          <p className="text-lg font-medium text-slate-600">Student Tracker Attitude Report</p>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
            Sistem pemantauan tingkah laku dan intervensi awal murid SMK Kampung Jawa
          </p>
        </div>

        <button type="button" onClick={() => router.push('/login')} className="btn-primary inline-flex items-center gap-2 text-base">
          Log Masuk ke Sistem
          <ArrowRight size={18} />
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => {
            const Icon = r.icon
            return (
              <div key={r.title} className="card text-left transition hover:-translate-y-0.5">
                <div className={`mb-4 inline-flex rounded-xl p-3 ${r.color}`}>
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{r.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{r.desc}</p>
              </div>
            )
          })}
        </div>

        <footer className="border-t border-slate-200/80 pt-8 text-sm text-slate-500">
          <p className="font-medium text-slate-600">STEM & TVET : Pemacu Aspirasi Kerjaya Digital Generasi Madani</p>
          <p className="mt-1 text-xs">SMK Kampung Jawa · JBA1010</p>
        </footer>
      </div>
    </div>
  )
}