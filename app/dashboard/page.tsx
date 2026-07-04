'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function DashboardPage() {
  const router = useRouter()
  const { profile, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push('/login')
      } else if (profile.must_change_password) {
        router.push('/reset-password')
      } else {
        // Redirect based on role
        switch (profile.role) {
          case 'student':
            router.push('/murid')
            break
          case 'counselor':
            router.push('/gbk')
            break
          case 'class_teacher':
          case 'discipline_teacher':
            router.push('/guru')
            break
          case 'parent':
            router.push('/ibu-bapa')
            break
          case 'admin':
            router.push('/pentadbir')
            break
          default:
            router.push('/')
        }
      }
    }
  }, [profile, loading, router])

  return (
    <div className="auth-shell flex min-h-[100dvh] items-center justify-center">
      <div className="relative z-10 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
        <p className="mt-4 text-sm font-medium text-slate-600">Memuatkan...</p>
      </div>
    </div>
  )
}
