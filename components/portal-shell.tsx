'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Backpack,
  FileText,
  TrendingUp,
  Trophy,
  MessageCircle,
  Users,
  Compass,
  ClipboardList,
  Inbox,
  Home,
  Settings,
  Upload,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useReachOutBadges } from '@/lib/use-reach-out-badges'

type Role = 'student' | 'class_teacher' | 'discipline_teacher' | 'counselor' | 'admin' | 'parent'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'class_teacher', 'discipline_teacher', 'counselor', 'admin', 'parent'] },
  { href: '/murid', label: 'Portal Murid', icon: Backpack, roles: ['student'] },
  { href: '/murid/refleksi', label: 'Refleksi Harian', icon: FileText, roles: ['student'] },
  { href: '/murid/sejarah', label: 'Rekod Saya', icon: TrendingUp, roles: ['student'] },
  { href: '/murid/lencana', label: 'Lencana', icon: Trophy, roles: ['student'] },
  { href: '/murid/reach-out', label: 'Reach Out', icon: MessageCircle, roles: ['student'] },
  { href: '/guru', label: 'Kelas Saya', icon: Users, roles: ['class_teacher', 'discipline_teacher', 'admin'] },
  { href: '/gbk', label: 'Pemantauan GBK', icon: Compass, roles: ['counselor', 'admin'] },
  { href: '/gbk/kes', label: 'Pengurusan Kes', icon: ClipboardList, roles: ['counselor', 'admin'] },
  { href: '/gbk/reach-out', label: 'Reach Out Inbox', icon: Inbox, roles: ['counselor', 'admin'] },
  { href: '/ibu-bapa', label: 'Portal Ibu Bapa', icon: Home, roles: ['parent', 'admin'] },
  { href: '/pentadbir', label: 'Pentadbir', icon: Settings, roles: ['admin'] },
  { href: '/pentadbir/upload-murid', label: 'Upload Murid', icon: Upload, roles: ['admin'] },
]

const roleLabels: Record<Role, string> = {
  student: 'Murid',
  class_teacher: 'Guru Kelas',
  discipline_teacher: 'Guru Disiplin',
  counselor: 'GBK',
  admin: 'Pentadbir',
  parent: 'Ibu Bapa',
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--sidebar)]">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function SidebarNav({
  visibleNav,
  pathname,
  onNavigate,
  badgeByHref,
}: {
  visibleNav: NavItem[]
  pathname: string
  onNavigate?: () => void
  badgeByHref: Record<string, number>
}) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {visibleNav.map((item) => {
        const Icon = item.icon
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? 'bg-cyan-500/15 text-cyan-50 ring-1 ring-cyan-400/25'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={18} strokeWidth={1.75} className={active ? 'text-cyan-300' : 'text-slate-400'} />
            <span className="truncate">{item.label}</span>
            <NavBadge count={badgeByHref[item.href] ?? 0} />
          </Link>
        )
      })}
    </nav>
  )
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
  const { counts: reachBadges } = useReachOutBadges(profile?.role, profile?.id)
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = profile?.role as Role | undefined
  const visibleNav = role ? navItems.filter((item) => item.roles.includes(role)) : []

  const badgeByHref: Record<string, number> = {}
  if (reachBadges.gbkNew > 0) {
    badgeByHref['/gbk/reach-out'] = reachBadges.gbkNew
  }
  if (reachBadges.studentUnreadReplies > 0) {
    badgeByHref['/murid/reach-out'] = reachBadges.studentUnreadReplies
  }
  const firstName = profile?.full_name?.split(' ')[0] || 'Pengguna'
  const today = new Date().toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex">
        <div className="border-b border-[var(--sidebar-border)] px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg overflow-hidden">
              <Image src="/logo-sekolah.png" alt="Logo" width={40} height={40} className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-white">S.T.A.R KJo</p>
              <p className="truncate text-xs text-slate-400">SK Mohd Khir Johari</p>
            </div>
          </Link>
        </div>

        <SidebarNav visibleNav={visibleNav} pathname={pathname} badgeByHref={badgeByHref} />

        <div className="border-t border-[var(--sidebar-border)] p-4">
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="truncate text-sm font-semibold text-white">{profile?.full_name || 'Pengguna'}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {role ? roleLabels[role] : 'Akaun'}
              {profile?.class_name ? ` · ${profile.class_name}` : ''}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <LogOut size={16} />
              Log Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-[var(--sidebar)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] px-4 py-4">
              <span className="font-bold text-white">Menu</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <SidebarNav
              visibleNav={visibleNav}
              pathname={pathname}
              badgeByHref={badgeByHref}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4 px-4 py-4 md:px-8">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Buka menu"
                >
                  <Menu size={20} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    Selamat datang, <span className="text-slate-800">{firstName}</span>
                  </p>
                  <p className="text-xs text-slate-400">{today}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 lg:hidden"
            >
              Keluar
            </button>
            {(reachBadges.gbkNew > 0 || reachBadges.studentUnreadReplies > 0) && (
              <Link
                href={reachBadges.gbkNew > 0 ? '/gbk/reach-out' : '/murid/reach-out'}
                className="relative shrink-0 rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600"
                title="Reach Out — mesej baharu"
              >
                <Inbox size={20} />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {reachBadges.gbkNew + reachBadges.studentUnreadReplies > 9
                    ? '9+'
                    : reachBadges.gbkNew + reachBadges.studentUnreadReplies}
                </span>
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <header className="panel mb-6 border-l-4 border-l-cyan-600 md:mb-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-balance">{title}</h1>
                {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">{subtitle}</p>}
              </div>
              {role && (
                <span className="inline-flex w-fit rounded-full bg-cyan-50 px-4 py-1.5 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-200">
                  {roleLabels[role]}
                </span>
              )}
            </div>
          </header>

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
  onClick,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  subtitle?: string
  onClick?: () => void
}) {
  const tones = {
    blue: { chip: 'bg-cyan-50 text-cyan-700 ring-cyan-100', value: 'text-cyan-800', icon: 'bg-cyan-600' },
    green: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', value: 'text-emerald-800', icon: 'bg-emerald-600' },
    orange: { chip: 'bg-amber-50 text-amber-800 ring-amber-100', value: 'text-amber-900', icon: 'bg-amber-500' },
    red: { chip: 'bg-rose-50 text-rose-700 ring-rose-100', value: 'text-rose-800', icon: 'bg-rose-600' },
    purple: { chip: 'bg-slate-100 text-slate-700 ring-slate-200', value: 'text-slate-800', icon: 'bg-slate-700' },
  }
  const t = tones[tone]

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${t.chip}`}>{label}</p>
          <p className={`mt-3 text-3xl font-bold tracking-tight ${t.value}`}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          {onClick && <p className="mt-2 text-xs font-medium text-cyan-600">Ketik untuk senarai murid</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${t.icon}`}>
          {icon}
        </div>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="panel w-full text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="panel transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      {inner}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`panel ${className}`}>{children}</div>
}