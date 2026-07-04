'use client'

import { PortalShell } from '@/components/portal-shell'
import { avgDisciplineByMonth, behaviorPie, demeritCount, refleksiCalendarDays, starsFromPct, labelBaik } from '@/lib/parent-dashboard'
import { BarChart2, Bell, Calendar, Heart, Star, Trophy, User, BookOpen, MessageCircle, Shield, Smartphone } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format } from 'date-fns'

const child = { full_name: 'MUHAMMAD AQIL HAKIMI', class_name: 'Tingkatan 3 Bestari', ic_number: '08DKA21F1034' }
const checkins = [
  { checkin_date: '2024-01-15', discipline_score: 68, emotional_score: 72, q1_kehadiran_ketepatan: 3, q7_perasaan_emosi: 'Tenang', q9_tahap_stres: 3 },
  { checkin_date: '2024-02-15', discipline_score: 71, emotional_score: 75, q1_kehadiran_ketepatan: 3, q7_perasaan_emosi: 'Gembira', q9_tahap_stres: 2 },
  { checkin_date: '2024-03-15', discipline_score: 74, emotional_score: 78, q1_kehadiran_ketepatan: 3, q7_perasaan_emosi: 'Tenang', q9_tahap_stres: 2 },
  { checkin_date: '2024-04-15', discipline_score: 77, emotional_score: 81, q1_kehadiran_ketepatan: 3, q7_perasaan_emosi: 'Teruja', q9_tahap_stres: 2 },
  { checkin_date: '2024-05-15', discipline_score: 78, emotional_score: 85, q1_kehadiran_ketepatan: 3, q7_perasaan_emosi: 'Gembira', q9_tahap_stres: 1 },
]
const behavior = [
  { record_type: 'merit', points: 2, record_date: '2024-05-01', description: 'Membantu guru' },
  { record_type: 'merit', points: 1, record_date: '2024-05-05', description: 'Sopan santun' },
  { record_type: 'discipline_case', points: -1, record_date: '2024-05-12', description: 'Lewat masuk kelas' },
  { record_type: 'attendance', points: 0, record_date: '2024-05-15', description: 'Hadir' },
  { record_type: 'cocurricular', points: 2, record_date: '2024-05-17', description: 'Aktiviti sekolah' },
]
const badges = [{ id: '1', badge_name: 'Disiplin Baik', icon: '⭐' }, { id: '2', badge_name: 'Kehadiran Cemerlang', icon: '🏅' }, { id: '3', badge_name: 'Aktif Sekolah', icon: '🎖️' }]
const sessions = 3
const trend = avgDisciplineByMonth(checkins, 5)
const pieData = behaviorPie(behavior)
const calDays = refleksiCalendarDays(new Date('2024-05-01'), new Set(checkins.map((c) => c.checkin_date)))
const latestDisc = 85
const latestEmo = 92
const latestAttend = 96
const demerits = demeritCount(behavior)

const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

function Stars({ n }: { n: number }) {
  return <span className="inline-flex gap-0.5">{[1,2,3,4,5].map((i)=><Star key={i} size={14} className={i<=n?'fill-amber-400 text-amber-400':'text-slate-200'} />)}</span>
}

export default function DemoIbuBapaPage() {
  return (
    <PortalShell title="Demo Portal Ibu Bapa" subtitle="Paparan demo tanpa login untuk semakan UI">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div><p className="text-lg font-bold text-slate-900">Selamat datang, Puan Norliza 👋</p><p className="text-xs text-slate-500">Kemaskini terakhir: 26 Mei 2024, 9:30 AM</p></div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-600"><Bell size={18} /><span className="text-xs font-semibold">1 notifikasi baru</span></div>
      </div>

      <div className="mb-6 panel flex flex-col gap-4 border-l-4 border-l-indigo-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">A</div><div><p className="text-lg font-black uppercase tracking-tight text-slate-900">{child.full_name}</p><p className="text-sm text-slate-600">{child.class_name}</p><p className="mt-1 text-xs text-slate-500">No. ID Murid: {child.ic_number}</p></div></div>
        <div className="flex gap-6 text-center"><div><p className="text-2xl font-black text-indigo-600">{latestDisc}%</p><p className="text-xs font-semibold text-slate-500">Disiplin</p><Stars n={starsFromPct(latestDisc)} /></div><div><p className="text-2xl font-black text-cyan-600">{latestAttend}%</p><p className="text-xs font-semibold text-slate-500">Attendance</p><p className="text-[10px] text-slate-400">Emosi: {latestEmo}%</p></div><div><p className="text-2xl font-black text-violet-600">{demerits}</p><p className="text-xs font-semibold text-slate-500">Demerit</p></div><div><p className="text-2xl font-black text-amber-600">{sessions}</p><p className="text-xs font-semibold text-slate-500">Sesi</p></div></div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[{label:'Skor Disiplin',value:`${latestDisc}%`,badge:labelBaik(latestDisc),icon:<BarChart2 className="text-white" size={20} />,grad:'from-blue-500 to-indigo-600'},{label:'Attendance',value:`${latestAttend}%`,badge:'CEMERLANG',icon:<Calendar className="text-white" size={20} />,grad:'from-emerald-500 to-teal-600'},{label:'Demerit Points',value:String(demerits),badge:'BAIK',icon:<Shield className="text-white" size={20} />,grad:'from-amber-500 to-orange-600'},{label:'Counseling Sessions',value:String(sessions),badge:'TERKINI',icon:<User className="text-white" size={20} />,grad:'from-violet-500 to-purple-600'}].map((k)=>(<div key={k.label} className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50"><div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${k.grad} p-2.5 shadow`}>{k.icon}</div><p className="text-2xl font-black text-slate-900">{k.value}</p><p className="text-sm font-semibold text-slate-700">{k.label}</p><span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{k.badge}</span></div>))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-lg"><h2 className="mb-4 text-base font-black text-slate-900">Trend Skor Disiplin (5 Bulan)</h2><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="skor" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-lg"><h2 className="mb-2 text-sm font-black text-slate-900">Taburan Tingkah Laku (Bulanan)</h2><div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{pieData.map((_, i)=><Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Legend wrapperStyle={{ fontSize: 10 }} /><Tooltip /></PieChart></ResponsiveContainer></div><p className="text-xs text-slate-500">Total: 24 incidents</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-lg"><h2 className="mb-3 text-sm font-black text-slate-900">Kalender Kehadiran</h2><div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">{['Is','Se','Ra','Kh','Ju','Sa','Ah'].map((d)=><span key={d}>{d}</span>)}</div><div className="mt-1 grid grid-cols-7 gap-1">{calDays.slice(0,35).map((d)=><div key={d.date.toISOString()} className={`aspect-square rounded-lg text-[10px] font-semibold flex items-center justify-center ${d.hasRefleksi?'bg-emerald-100 text-emerald-800':'bg-slate-50 text-slate-400'}`}>{format(d.date,'d')}</div>)}</div></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-md"><div className="mb-3 flex items-center gap-2"><Trophy className="text-amber-600" size={20} /><h2 className="font-black text-slate-900">Pencapaian & Penghargaan</h2></div><p className="mb-3 text-sm font-semibold text-amber-900">Tahniah Aqil! 🎉 Teruskan usaha yang baik!</p><div className="grid grid-cols-3 gap-2">{badges.map((b)=><div key={b.id} className="rounded-xl bg-white/80 p-2 text-center shadow-sm"><span className="text-xl">{b.icon}</span><p className="mt-1 text-[9px] font-bold leading-tight text-slate-700">{b.badge_name}</p></div>)}</div></div>
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-lg"><h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><MessageCircle size={18} className="text-violet-600" />Catatan Guru Kaunseling</h2><p className="text-xs leading-relaxed text-slate-600">Aqil menunjukkan peningkatan positif dalam disiplin dan perhatian terhadap sekolah. Teruskan usaha yang baik dan sentiasa fokus kepada pelajaran.</p><p className="mt-2 font-semibold text-violet-800">Pn. Aisyah Binti Rahman · 24 Mei 2024</p></div>
          <div className="rounded-2xl bg-slate-50 p-5"><h2 className="mb-3 text-sm font-black text-slate-900">Sumber Untuk Ibu Bapa</h2><ul className="space-y-2 text-xs font-semibold text-indigo-700"><li className="flex items-center gap-2"><BookOpen size={14} /> Tips for Teen Guidance</li><li className="flex items-center gap-2"><Heart size={14} /> Communication at Home</li><li className="flex items-center gap-2"><Smartphone size={14} /> Managing Children&apos;s Screen Time</li></ul></div>
        </div>
      </div>
    </PortalShell>
  )
}
