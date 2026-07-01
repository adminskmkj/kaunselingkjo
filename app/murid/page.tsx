'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell, StatCard } from '@/components/portal-shell'

type PointsTracker = {
  total_points: number
  current_streak: number
  longest_streak: number
}

type TodayCheckin = {
  id: string
  total_score: number
}

export default function MuridDashboard() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [points, setPoints] = useState<PointsTracker | null>(null)
  const [todayCheckin, setTodayCheckin] = useState<TodayCheckin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.push('/login')
      } else if (profile.role !== 'student') {
        router.push('/dashboard')
      } else {
        fetchData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading, router])

  const fetchData = async () => {
    if (!profile) return

    try {
      if (profile.id.startsWith('demo-')) {
        setPoints({ total_points: 120, current_streak: 7, longest_streak: 12 })
        const demoToday = localStorage.getItem('star-kjo-demo-checkin-today')
        setTodayCheckin(demoToday ? { id: 'demo-checkin', total_score: 88 } : null)
        return
      }

      // Fetch points tracker
      const { data: pointsData } = await supabase
        .from('points_tracker')
        .select('*')
        .eq('student_id', profile.id)
        .single()

      setPoints(pointsData)

      // Check today's checkin
      const today = new Date().toISOString().split('T')[0]
      const { data: checkinData } = await supabase
        .from('checkins')
        .select('id, total_score')
        .eq('student_id', profile.id)
        .eq('checkin_date', today)
        .single()

      setTodayCheckin(checkinData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Dashboard Murid">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-neutral-600">Memuatkan...</p>
          </div>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Dashboard Murid" subtitle="Pantau perkembangan dan refleksi harian anda">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          label="Streak Harian" 
          value={points?.current_streak || 0}
          icon="🔥"
          tone="orange"
          subtitle={`Rekod terbaik: ${points?.longest_streak || 0} hari`}
        />
        
        <StatCard 
          label="Total Mata" 
          value={points?.total_points || 0}
          icon="⭐"
          tone="green"
        />
        
        <StatCard 
          label="Skor Hari Ini" 
          value={todayCheckin ? `${todayCheckin.total_score?.toFixed(0)}%` : '--'}
          icon="📊"
          tone={todayCheckin ? 'blue' : 'red'}
          subtitle={todayCheckin ? '✓ Sudah isi' : 'Belum isi'}
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-4xl mb-4">
              📝
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Refleksi Harian</h2>
            <p className="text-neutral-600">
              {todayCheckin 
                ? 'Anda sudah mengisi refleksi hari ini. Terima kasih!'
                : 'Luangkan 2 minit untuk refleksi hari ini'}
            </p>
          </div>
          
          <button
            onClick={() => router.push('/murid/refleksi')}
            disabled={!!todayCheckin}
            className={todayCheckin ? 'btn-secondary w-full opacity-50 cursor-not-allowed' : 'btn-primary w-full'}
          >
            {todayCheckin ? '✓ Sudah Selesai Hari Ini' : 'Mula Refleksi'}
          </button>
        </div>

        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-100 text-4xl mb-4">
              📅
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Tempah Sesi</h2>
            <p className="text-neutral-600">
              Perlukan bimbingan atau kaunseling? Tempah sesi dengan GBK
            </p>
          </div>
          
          <button
            onClick={() => router.push('/murid/tempah-sesi')}
            className="btn-primary w-full bg-accent-600 hover:bg-accent-700 focus:ring-accent-200"
          >
            Tempah Sekarang
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Akses Pantas</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '📈', label: 'Sejarah Refleksi', path: '/murid/sejarah' },
            { icon: '🏆', label: 'Lencana Saya', path: '/murid/lencana' },
            { icon: '📆', label: 'Sesi Kaunseling', path: '/murid/sesi' },
            { icon: '👤', label: 'Profil', path: '/murid/profil' },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              className="card text-center hover:shadow-strong hover:border-primary-200 transition-all duration-200 group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{link.icon}</div>
              <p className="text-sm font-semibold text-neutral-700 group-hover:text-primary-600 transition-colors">{link.label}</p>
            </button>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}
