'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Role = 'student' | 'class_teacher' | 'discipline_teacher' | 'counselor' | 'admin' | 'parent'

type NavItem = {
  href: string
  label: string
  icon: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['student', 'class_teacher', 'discipline_teacher', 'counselor', 'admin', 'parent'] },
  { href: '/murid', label: 'Portal Murid', icon: '🎒', roles: ['student'] },
  { href: '/murid/refleksi', label: 'Refleksi Harian', icon: '📝', roles: ['student'] },
  { href: '/murid/sejarah', label: 'Rekod Saya', icon: '📈', roles: ['student'] },
  { href: '/murid/lencana', label: 'Lencana', icon: '🏆', roles: ['student'] },
  { href: '/murid/reach-out', label: 'Reach Out', icon: '💬', roles: ['student'] },
  { href: '/guru', label: 'Kelas Saya', icon: '👩‍🏫', roles: ['class_teacher', 'discipline_teacher', 'admin'] },
  { href: '/gbk', label: 'Pemantauan GBK', icon: '🧭', roles: ['counselor', 'admin'] },
  { href: '/gbk/kes', label: 'Pengurusan Kes', icon: '📋', roles: ['counselor', 'admin'] },
  { href: '/gbk/reach-out', label: 'Reach Out Inbox', icon: '📬', roles: ['counselor', 'admin'] },
  { href: '/ibu-bapa', label: 'Portal Ibu Bapa', icon: '👪', roles: ['parent', 'admin'] },
  { href: '/pentadbir', label: 'Pentadbir', icon: '⚙️', roles: ['admin'] },
  { href: '/pentadbir/upload-murid', label: 'Upload Murid', icon: '📤', roles: ['admin'] },
]

const roleLabels: Record<Role, string> = {
  student: 'Murid',
  class_teacher: 'Guru Kelas',
  discipline_teacher: 'Guru Disiplin',
  counselor: 'GBK',
  admin: 'Pentadbir',
  parent: 'Ibu Bapa',
}

export function PortalShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const role = profile?.role as Role | undefined
  const visibleNav = role ? navItems.filter((item) => item.roles.includes(role)) : []
  const today = new Date().toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#f3f7fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white shadow-2xl lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-blue-950 shadow-lg">
              S
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">S.T.A.R KJo</p>
              <p className="text-xs text-blue-100/70">SMART Behaviour Tracker</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {visibleNav.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-blue-950 shadow-lg shadow-blue-950/20'
                    : 'text-blue-50/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold">{profile?.full_name || 'Pengguna'}</p>
            <p className="mt-1 text-xs text-blue-100/70">{role ? roleLabels[role] : 'Akaun'}{profile?.class_name ? ` • ${profile.class_name}` : ''}</p>
            <button
              onClick={async () => {
                await signOut()
                router.push('/login')
              }}
              className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Log Keluar
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-4 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">SMK Seri Madani • 2024/2025</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Selamat datang, {profile?.full_name?.split(' ')[0] || 'Cikgu'} 👋
              </h1>
              <p className="mt-1 text-sm text-slate-500">{today}</p>
            </div>
            <button
              onClick={async () => {
                await signOut()
                router.push('/login')
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 lg:hidden"
            >
              Log Keluar
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 p-7 text-white shadow-2xl shadow-blue-900/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100/80">SMART Behaviour Tracker</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
                {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/85 md:text-base">{subtitle}</p>}
              </div>
              {role && (
                <span className="inline-flex w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20">
                  {roleLabels[role]}
                </span>
              )}
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  subtitle,
}: {
  label: string
  value: string | number
  icon: string
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  subtitle?: string
}) {
  const tones = {
    blue: 'from-blue-500 to-indigo-600 text-blue-700 bg-blue-50 ring-blue-100',
    green: 'from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50 ring-emerald-100',
    orange: 'from-orange-500 to-amber-500 text-orange-700 bg-orange-50 ring-orange-100',
    red: 'from-rose-500 to-red-600 text-rose-700 bg-rose-50 ring-rose-100',
    purple: 'from-purple-500 to-fuchsia-600 text-purple-700 bg-purple-50 ring-purple-100',
  }

  return (
    <div className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-xl shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-300/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className={`mt-3 text-4xl font-black tracking-tight ${tones[tone].split(' ')[2]}`}>{value}</p>
          {subtitle && <p className="mt-2 text-xs font-medium text-slate-400">{subtitle}</p>}
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-lg ${tones[tone].split(' ').slice(0, 2).join(' ')}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
