'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell } from '@/components/portal-shell'
import { Flame, Star, BarChart2, BookOpen, CalendarCheck, Trophy, ArrowRight, TrendingUp, Heart, FileText } from 'lucide-react'

type PointsTracker = { total_points: number; current_streak: number; longest_streak: number }
type TodayCheckin = { id: string; discipline_score: number | null; emotional_score: number | null }
type CheckinHistory = { checkin_date: string; discipline_score: number | null; emotional_score: number | null }
type Badge = { id: string; badge_name: string; icon: string | null }

const quickLinks = [
  { icon: <TrendingUp size={22} />, label: 'Sejarah Refleksi', path: '/murid/sejarah', bg: 'bg-cyan-600' },
  { icon: <Trophy size={22} />, label: 'Lencana Saya', path: '/murid/lencana', bg: 'bg-amber-500' },
  { icon: <Heart size={22} />, label: 'Reach Out GBK', path: '/murid/reach-out', bg: 'bg-rose-600' },
  { icon: <CalendarCheck size={22} />, label: 'Sesi Kaunseling', path: '/murid/sesi', bg: 'bg-emerald-600' },
  { icon: <BookOpen size={22} />, label: 'Profil Saya', path: '/murid/profil', bg: 'bg-slate-700' },
]

function ScoreRing({ pct }: { pct: number }) {
  const r = 40; const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const label = pct >= 80 ? 'Cemerlang' : pct >= 60 ? 'Baik' : pct >= 40 ? 'Sederhana' : 'Perlu Bimbingan'
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
    </div>
  )
}

export default function MuridDashboard() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [points, setPoints] = useState<PointsTracker | null>(null)
  const [todayCheckin, setTodayCheckin] = useState<TodayCheckin | null>(null)
  const [history, setHistory] = useState<CheckinHistory[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!profile) router.push('/login')
      else if (profile.role !== 'student') router.push('/dashboard')
      else fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading])

  async function fetchData() {
    if (!profile) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const [ptRes, ciRes, histRes, badgeRes] = await Promise.all([
        supabase.from('points_tracker').select('total_points,current_streak,longest_streak').eq('student_id', profile.id).maybeSingle(),
        supabase.from('checkins').select('id,discipline_score,emotional_score').eq('student_id', profile.id).eq('checkin_date', today).maybeSingle(),
        supabase.from('checkins').select('checkin_date,discipline_score,emotional_score').eq('student_id', profile.id).order('checkin_date', { ascending: false }).limit(7),
        supabase.from('student_badges').select('id,badge_name,icon').eq('student_id', profile.id).limit(6),
      ])
      setPoints(ptRes.data || { total_points: 0, current_streak: 0, longest_streak: 0 })
      setTodayCheckin(ciRes.data as TodayCheckin | null)
      setHistory((histRes.data || []) as CheckinHistory[])
      setBadges((badgeRes.data || []) as Badge[])
    } finally { setLoading(false) }
  }

  if (authLoading || loading) return (
    <PortalShell title="Dashboard Murid">
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    </PortalShell>
  )

  const todayDisc = Math.round(todayCheckin?.discipline_score ?? 0)
  const todayEmo = Math.round(todayCheckin?.emotional_score ?? 0)
  const avgDisc = history.length
    ? Math.round(history.reduce((a, c) => a + (c.discipline_score ?? 0), 0) / history.length)
    : 0
  const avgEmo = history.length
    ? Math.round(history.reduce((a, c) => a + (c.emotional_score ?? 0), 0) / history.length)
    : 0

  return (
    <PortalShell title="Dashboard Murid" subtitle="Pantau perkembangan dan refleksi harian anda">
      {/* KPI */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { icon: <Flame size={20} />, label: 'Streak Harian', value: `${points?.current_streak ?? 0} hari`, sub: `Rekod: ${points?.longest_streak ?? 0} hari`, bg: 'bg-orange-500' },
          { icon: <Star size={20} />, label: 'Jumlah Mata', value: points?.total_points ?? 0, sub: 'Dikumpul setakat ini', bg: 'bg-amber-500' },
          { icon: <BarChart2 size={20} />, label: 'Skor Disiplin', value: `${avgDisc}%`, sub: 'Purata 7 hari', bg: 'bg-cyan-600' },
          { icon: <Heart size={20} />, label: 'Skor Emosi', value: `${avgEmo}%`, sub: 'Purata 7 hari', bg: 'bg-slate-600' },
          { icon: <Trophy size={20} />, label: 'Lencana', value: badges.length, sub: 'Pencapaian diperoleh', bg: 'bg-emerald-600' },
        ].map((k) => (
          <div key={k.label} className="panel transition hover:-translate-y-0.5">
            <div className={`mb-3 inline-flex items-center justify-center rounded-xl ${k.bg} p-2.5 text-white`}>
              {k.icon}
            </div>
            <p className="text-2xl font-black text-slate-900">{k.value}</p>
            <p className="text-sm font-semibold text-slate-600">{k.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Skor + Trend */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/60 space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Trend Skor Disiplin (7 Hari)</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{avgDisc}% purata</span>
              </div>
              {history.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Belum ada rekod.</p>
              ) : (
                <div className="flex items-end gap-2 h-24">
                  {[...history].reverse().map((h, i) => {
                    const pct = Math.round(h.discipline_score ?? 0)
                    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                    return (
                      <div key={`d-${i}`} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-600">{pct}%</span>
                        <div className={`w-full rounded-t-lg ${color}`} style={{ height: `${(pct / 100) * 64}px`, minHeight: 4 }} />
                        <span className="text-[10px] text-slate-400">{h.checkin_date.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Trend Skor Emosi (7 Hari)</h2>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{avgEmo}% purata</span>
              </div>
              {history.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Belum ada rekod.</p>
              ) : (
                <div className="flex items-end gap-2 h-24">
                  {[...history].reverse().map((h, i) => {
                    const pct = Math.round(h.emotional_score ?? 0)
                    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-violet-500' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                    return (
                      <div key={`e-${i}`} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-600">{pct}%</span>
                        <div className={`w-full rounded-t-lg ${color}`} style={{ height: `${(pct / 100) * 64}px`, minHeight: 4 }} />
                        <span className="text-[10px] text-slate-400">{h.checkin_date.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Lencana */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Lencana & Pencapaian</h2>
              <button onClick={() => router.push('/murid/lencana')} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                Lihat semua <ArrowRight size={14} />
              </button>
            </div>
            {badges.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Belum ada lencana. Terus buat refleksi untuk unlock.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {badges.map((b) => (
                  <div key={b.id} className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-50 p-3 text-center">
                    <span className="text-2xl">{b.icon ?? '🏅'}</span>
                    <span className="text-[10px] font-bold leading-tight text-slate-700">{b.badge_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Skor hari ini */}
          <div className="panel bg-slate-900 text-white ring-0">
            <p className="mb-4 text-sm font-semibold text-slate-300">Skor Hari Ini</p>
            <div className="flex justify-center gap-6">
              {todayCheckin ? (
                <>
                  <div className="text-center">
                    <ScoreRing pct={todayDisc} />
                    <p className="mt-2 text-xs font-bold opacity-90">Disiplin</p>
                  </div>
                  <div className="text-center">
                    <ScoreRing pct={todayEmo} />
                    <p className="mt-2 text-xs font-bold opacity-90">Emosi</p>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <FileText className="mx-auto text-slate-400" size={36} />
                  <p className="mt-3 text-sm font-medium text-slate-300">Belum isi refleksi</p>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/murid/refleksi')}
              disabled={!!todayCheckin}
              className="mt-5 w-full rounded-2xl bg-cyan-500 py-3 text-sm font-bold text-white transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {todayCheckin ? '✓ Sudah Selesai Hari Ini' : 'Mula Refleksi Sekarang'}
            </button>
            <button
              onClick={() => router.push('/murid/tempah-sesi')}
              className="mt-3 w-full rounded-2xl border border-white/30 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Tempah Sesi Kaunseling
            </button>
          </div>

          {/* Quick links */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-5 shadow-xl shadow-slate-200/60">
            <h2 className="mb-4 text-base font-black text-slate-900">Akses Pantas</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((l) => (
                <button
                  key={l.path}
                  onClick={() => router.push(l.path)}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-slate-50 p-4 text-center transition hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${l.bg} text-white transition-transform group-hover:scale-105`}>
                    {l.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
