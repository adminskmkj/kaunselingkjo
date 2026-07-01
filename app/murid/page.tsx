'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuatkan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">S.T.A.R KJo</h1>
            <p className="text-sm text-gray-600">{profile?.full_name} • {profile?.class_name}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log Keluar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Streak Harian</p>
                <p className="text-3xl font-bold text-blue-600">{points?.current_streak || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Rekod: {points?.longest_streak || 0} hari</p>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Mata</p>
                <p className="text-3xl font-bold text-green-600">{points?.total_points || 0}</p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Skor Hari Ini</p>
                {todayCheckin ? (
                  <>
                    <p className="text-3xl font-bold text-purple-600">
                      {todayCheckin.total_score?.toFixed(0)}%
                    </p>
                    <p className="text-xs text-green-600 mt-1">✓ Sudah isi</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-400">--</p>
                    <p className="text-xs text-orange-600 mt-1">Belum isi</p>
                  </>
                )}
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Refleksi Harian</h2>
              <p className="text-gray-600">
                {todayCheckin 
                  ? 'Anda sudah mengisi refleksi hari ini. Terima kasih!'
                  : 'Luangkan 2 minit untuk refleksi hari ini'}
              </p>
            </div>
            
            <button
              onClick={() => router.push('/murid/refleksi')}
              disabled={!!todayCheckin}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                todayCheckin
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {todayCheckin ? 'Sudah Selesai Hari Ini' : 'Mula Refleksi'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tempah Sesi</h2>
              <p className="text-gray-600">
                Perlukan bimbingan atau kaunseling? Tempah sesi dengan GBK
              </p>
            </div>
            
            <button
              onClick={() => router.push('/murid/tempah-sesi')}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Tempah Sekarang
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/murid/sejarah')}
            className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">📈</div>
            <p className="text-sm font-medium text-gray-900">Sejarah Refleksi</p>
          </button>

          <button
            onClick={() => router.push('/murid/lencana')}
            className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-medium text-gray-900">Lencana Saya</p>
          </button>

          <button
            onClick={() => router.push('/murid/sesi')}
            className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">📆</div>
            <p className="text-sm font-medium text-gray-900">Sesi Kaunseling</p>
          </button>

          <button
            onClick={() => router.push('/murid/profil')}
            className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm font-medium text-gray-900">Profil</p>
          </button>
        </div>
      </main>
    </div>
  )
}
