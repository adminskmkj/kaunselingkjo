'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PortalShell } from '@/components/portal-shell'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { BarChart2, Flame, Trophy, TrendingUp, BookOpen, Heart } from 'lucide-react'

type ChildRow = { id: string; full_name: string; class_name: string | null }
type CheckinRow = { id: string; checkin_date: string; discipline_score: number | null; emotional_score: number | null; q7_perasaan_emosi: string | null; q9_tahap_stres: number | null }
type PointsRow = { total_points: number; current_streak: number }
type BadgeRow = { id: string; badge_name: string; icon: string | null }

function ScoreRing({ pct }: { pct: number }) {
  const r = 38; const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const label = pct >= 80 ? 'Cemerlang' : pct >= 60 ? 'Baik' : pct >= 40 ? 'Sederhana' : 'Perlu Bimbingan'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 46 46)" />
        <text x="46" y="50" textAnchor="middle" fontSize="16" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
    </div>
  )
}

const emojiMap: Record<string, string> = {
  'Gembira': '😄', 'Sedih': '😢', 'Marah': '😠', 'Cemas': '😰',
  'Tenang': '😌', 'Bosan': '😑', 'Teruja': '🤩', 'Penat': '😫',
}

export default function IbuBapaPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [points, setPoints] = useState<PointsRow | null>(null)
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [parentReachOut, setParentReachOut] = useState('')
  const [sendingReachOut, setSendingReachOut] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push('/login'); return }
    if (profile.role !== 'parent' && profile.role !== 'admin') { router.push('/dashboard'); return }
    fetchChildren()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function fetchChildren() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles').select('id, full_name, class_name')
      .eq('parent_id', profile!.id).order('full_name')
    const rows = (data || []) as ChildRow[]
    setChildren(rows)
    if (rows.length > 0) setSelectedChildId(rows[0].id)
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedChildId) { setCheckins([]); setPoints(null); setBadges([]); return }
    fetchChildData(selectedChildId)
  }, [selectedChildId])

  async function fetchChildData(id: string) {
    const [ciRes, ptRes, bdRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('checkins').select('id,checkin_date,discipline_score,emotional_score,q7_perasaan_emosi,q9_tahap_stres').eq('student_id', id).order('checkin_date', { ascending: false }).limit(10),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('points_tracker').select('total_points,current_streak').eq('student_id', id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('student_badges').select('id,badge_name,icon').eq('student_id', id).limit(6),
    ])
    setCheckins((ciRes.data || []) as CheckinRow[])
    setPoints(ptRes.data as PointsRow | null)
    setBadges((bdRes.data || []) as BadgeRow[])
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)
  const latestDisc = checkins[0]?.discipline_score ?? 0
  const latestEmo = checkins[0]?.emotional_score ?? 0
  const recentCheckins = [...checkins].slice(0, 7).reverse()

  if (authLoading || loading) return (
    <PortalShell title="Portal Ibu Bapa">
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    </PortalShell>
  )

  if (children.length === 0) return (
    <PortalShell title="Portal Ibu Bapa">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-5xl">👪</p>
        <h2 className="mt-4 text-xl font-black text-slate-900">Belum ada anak dipautkan</h2>
        <p className="mt-2 text-sm text-slate-500">Hubungi pentadbir untuk pautkan akaun ibu bapa kepada profil murid.</p>
      </div>
    </PortalShell>
  )

  return (
    <PortalShell title="Portal Ibu Bapa" subtitle="Paparan ringkas perkembangan anak. Nota dalaman tidak dipaparkan.">

      {/* Pilih anak */}
      {children.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {children.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChildId(ch.id)}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${selectedChildId === ch.id
                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
            >
              {ch.full_name} {ch.class_name ? `· ${ch.class_name}` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Profil anak */}
      {selectedChild && (
        <div className="mb-6 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black text-white shadow">
                {selectedChild.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-black">{selectedChild.full_name}</p>
                <p className="text-sm opacity-80">{selectedChild.class_name || 'Kelas belum ditetapkan'}</p>
                <p className="mt-1 text-xs opacity-60">Perkembangan semasa</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="text-center">
                <ScoreRing pct={Math.round(latestDisc)} />
                <p className="mt-2 text-xs font-bold opacity-90">Disiplin</p>
              </div>
              <div className="text-center">
                <ScoreRing pct={Math.round(latestEmo)} />
                <p className="mt-2 text-xs font-bold opacity-90">Emosi</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { icon: <BarChart2 size={20} />, label: 'Skor Disiplin', value: latestDisc ? `${Math.round(latestDisc)}%` : '--', sub: 'Refleksi terakhir', bg: 'from-blue-500 to-indigo-600' },
          { icon: <Heart size={20} />, label: 'Skor Emosi', value: latestEmo ? `${Math.round(latestEmo)}%` : '--', sub: 'Refleksi terakhir', bg: 'from-violet-500 to-purple-600' },
          { icon: <Flame size={20} />, label: 'Streak', value: `${points?.current_streak ?? 0} hari`, sub: 'Streak semasa', bg: 'from-orange-400 to-rose-500' },
          { icon: <TrendingUp size={20} />, label: 'Jumlah Mata', value: points?.total_points ?? 0, sub: 'Dikumpul setakat ini', bg: 'from-emerald-500 to-teal-600' },
          { icon: <Trophy size={20} />, label: 'Lencana', value: badges.length, sub: 'Pencapaian diperoleh', bg: 'from-amber-400 to-orange-500' },
        ].map((k) => (
          <div key={k.label} className="overflow-hidden rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/60 transition hover:shadow-xl hover:-translate-y-0.5">
            <div className={`mb-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${k.bg} p-2.5 text-white shadow`}>
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

          {/* Trend skor */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/60 space-y-6">
            <div>
              <h2 className="mb-3 text-base font-black text-slate-900">Trend Skor Disiplin (7 Hari)</h2>
              {recentCheckins.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Belum ada rekod.</p>
              ) : (
                <div className="flex items-end gap-2 h-24">
                  {recentCheckins.map((h, i) => {
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
              <h2 className="mb-3 text-base font-black text-slate-900">Trend Skor Emosi (7 Hari)</h2>
              {recentCheckins.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Belum ada rekod.</p>
              ) : (
                <div className="flex items-end gap-2 h-24">
                  {recentCheckins.map((h, i) => {
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

          {/* Sejarah refleksi */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-black text-slate-900">Sejarah Refleksi {selectedChild?.full_name}</h2>
            </div>
            {checkins.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">Belum ada refleksi direkodkan.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {checkins.slice(0, 8).map((c) => {
                  const disc = Math.round(c.discipline_score ?? 0)
                  const emo = Math.round(c.emotional_score ?? 0)
                  const color = emo >= 80 ? 'text-emerald-600 bg-emerald-50' : emo >= 60 ? 'text-blue-600 bg-blue-50' : emo >= 40 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/60 transition">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
                        {emojiMap[c.q7_perasaan_emosi ?? ''] ?? '😐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{c.checkin_date}</p>
                        <p className="text-xs text-slate-500">
                          Emosi: {c.q7_perasaan_emosi || '—'} · Stres: {c.q9_tahap_stres ?? '—'}/10
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>D {disc}% · E {emo}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lencana */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white p-5 shadow-xl shadow-slate-200/60">
            <div className="mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="text-base font-black text-slate-900">Pencapaian & Lencana</h2>
            </div>
            {badges.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada lencana diperoleh.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {badges.map((b) => (
                  <div key={b.id} className="flex flex-col items-center gap-1.5 rounded-xl bg-amber-50 p-2.5 text-center">
                    <span className="text-xl">{b.icon ?? '🏅'}</span>
                    <span className="text-[10px] font-bold leading-tight text-slate-700">{b.badge_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nota ibu bapa */}
          <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-blue-50 p-5 shadow-lg shadow-slate-200/40">
            <div className="mb-3 flex items-center gap-2">
              <Heart size={16} className="text-rose-500" />
              <h2 className="text-sm font-black text-slate-800">Nota untuk Ibu Bapa</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Portal ini menunjukkan perkembangan umum anak anda. Rekod sulit dan nota dalaman guru/GBK tidak dipaparkan demi menjaga privasi murid.
            </p>
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-slate-700">Reach Out kepada GBK (untuk anak dipilih)</label>
              <textarea
                value={parentReachOut}
                onChange={(e) => setParentReachOut(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                rows={3}
                placeholder="Contoh: Saya perhatikan anak saya kelihatan sedih..."
                disabled={!selectedChildId}
              />
              <button
                type="button"
                disabled={!selectedChildId || !parentReachOut.trim() || sendingReachOut}
                onClick={async () => {
                  if (!profile || !selectedChildId) return
                  setSendingReachOut(true)
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error } = await (supabase as any).from('reach_out_messages').insert({
                      student_id: selectedChildId,
                      sender_id: profile.id,
                      message: parentReachOut.trim(),
                      source: 'ibu_bapa',
                      status: 'baru',
                    })
                    if (error) throw error
                    setParentReachOut('')
                    alert('Mesej dihantar kepada GBK.')
                  } catch (e) {
                    console.error(e)
                    alert('Gagal hantar. Pastikan migration 012 Reach Out dah apply.')
                  } finally {
                    setSendingReachOut(false)
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:opacity-50"
              >
                <Heart size={14} />
                {sendingReachOut ? 'Menghantar...' : 'Hantar Reach Out'}
              </button>
            </div>
            <button
              onClick={() => router.push('/murid/sesi')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              <BookOpen size={14} />
              Lihat Sesi Kaunseling
            </button>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
