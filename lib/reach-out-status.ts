export type ReachOutStatus = 'baru' | 'dibaca' | 'dijawab' | 'ditutup'
export type ReachOutSource = 'murid' | 'ibu_bapa' | 'refleksi' | 'guru'

export const REACH_OUT_STATUS_LABELS: Record<ReachOutStatus, string> = {
  baru: 'Baru',
  dibaca: 'Dibaca',
  dijawab: 'Dijawab',
  ditutup: 'Ditutup',
}

export const REACH_OUT_SOURCE_LABELS: Record<ReachOutSource, string> = {
  murid: 'Murid',
  ibu_bapa: 'Ibu Bapa',
  refleksi: 'Refleksi',
  guru: 'Rujukan Guru',
}

export function reachOutStatusClass(status: ReachOutStatus): string {
  switch (status) {
    case 'baru':
      return 'bg-rose-100 text-rose-800 border-rose-200'
    case 'dibaca':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    case 'dijawab':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'ditutup':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}