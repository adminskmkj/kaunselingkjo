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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuatkan...</p>
      </div>
    </div>
  )
}
