import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ms } from 'date-fns/locale'

export type MonthDisciplinePoint = { month: string; skor: number }

export function avgDisciplineByMonth(
  checkins: { checkin_date: string; discipline_score: number | null }[],
  months = 5
): MonthDisciplinePoint[] {
  const buckets = new Map<string, { sum: number; n: number }>()
  for (const c of checkins) {
    if (c.discipline_score == null) continue
    const key = c.checkin_date.slice(0, 7)
    const b = buckets.get(key) || { sum: 0, n: 0 }
    b.sum += c.discipline_score
    b.n += 1
    buckets.set(key, b)
  }
  const keys = [...buckets.keys()].sort().slice(-months)
  return keys.map((k) => {
    const b = buckets.get(k)!
    const d = new Date(`${k}-01`)
    return {
      month: format(d, 'MMM', { locale: ms }),
      skor: Math.round(b.sum / b.n),
    }
  })
}

export function attendancePctFromCheckins(
  checkins: { q1_kehadiran_ketepatan?: number | null }[]
): number | null {
  const vals = checkins
    .map((c) => c.q1_kehadiran_ketepatan)
    .filter((v): v is number => v != null && v >= 1 && v <= 3)
  if (!vals.length) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round((avg / 3) * 100)
}

export function demeritCount(records: { points: number | null; record_type: string }[]): number {
  return records.filter((r) => r.record_type === 'discipline_case' || (r.points != null && r.points < 0)).length
}

export function behaviorPie(
  records: { record_type: string }[]
): { name: string; value: number }[] {
  const labels: Record<string, string> = {
    merit: 'Baik / Merit',
    discipline_case: 'Kes Disiplin',
    attendance: 'Kehadiran',
    cocurricular: 'Ko-kurikulum',
    self_reflection: 'Refleksi',
    teacher_note: 'Lain',
  }
  const counts = new Map<string, number>()
  for (const r of records) {
    const name = labels[r.record_type] || r.record_type
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }))
}

export function refleksiCalendarDays(
  month: Date,
  checkinDates: Set<string>
): { date: Date; inMonth: boolean; hasRefleksi: boolean; isToday: boolean }[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  return days.map((date) => ({
    date,
    inMonth: isSameMonth(date, month),
    hasRefleksi: checkinDates.has(format(date, 'yyyy-MM-dd')),
    isToday: isToday(date),
  }))
}

export function starsFromPct(pct: number): number {
  if (pct >= 90) return 5
  if (pct >= 75) return 4
  if (pct >= 60) return 3
  if (pct >= 45) return 2
  return 1
}

export function labelBaik(pct: number): string {
  if (pct >= 85) return 'CEMERLANG'
  if (pct >= 70) return 'BAIK'
  if (pct >= 50) return 'SEDERHANA'
  return 'PERLU BANTUAN'
}

export function formatLastUpdate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return format(new Date(iso), "d MMM yyyy, h:mm a", { locale: ms })
  } catch {
    return iso
  }
}