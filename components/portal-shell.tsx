'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function PortalShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-bold text-lg shadow-soft">
                S
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">S.T.A.R KJo</h1>
                <p className="text-xs text-neutral-500">Student Tracker System</p>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-neutral-900">{profile?.full_name || 'Demo User'}</p>
              {profile?.class_name && (
                <p className="text-xs text-neutral-500">{profile.class_name}</p>
              )}
            </div>
            <button
              onClick={async () => {
                await signOut()
                router.push('/login')
              }}
              className="btn-secondary text-sm py-2"
            >
              Log Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-neutral-600">{subtitle}</p>}
        </div>
        {children}
      </main>
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
    blue: 'text-primary-600 bg-primary-50',
    green: 'text-accent-600 bg-accent-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
  }

  const iconBgTones = {
    blue: 'bg-primary-100',
    green: 'bg-accent-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
    purple: 'bg-purple-100',
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{label}</p>
          <p className={`text-3xl font-bold tracking-tight ${tones[tone]}`}>{value}</p>
          {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-14 h-14 rounded-xl ${iconBgTones[tone]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
