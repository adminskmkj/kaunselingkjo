export type CaseStatus =
  | 'baru'
  | 'dalam_tindakan'
  | 'susulan'
  | 'selesai'
  | 'rujuk_luar'

export const CASE_STATUS_ORDER: CaseStatus[] = [
  'baru',
  'dalam_tindakan',
  'susulan',
  'selesai',
  'rujuk_luar',
]

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  baru: 'Baru',
  dalam_tindakan: 'Dalam Tindakan',
  susulan: 'Susulan',
  selesai: 'Selesai',
  rujuk_luar: 'Rujuk Luar',
}

/** Kes belum ditutup */
export const OPEN_CASE_STATUSES: CaseStatus[] = ['baru', 'dalam_tindakan', 'susulan', 'rujuk_luar']

export function caseStatusBadgeClass(status: CaseStatus): string {
  switch (status) {
    case 'baru':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    case 'dalam_tindakan':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    case 'susulan':
      return 'bg-violet-100 text-violet-800 border-violet-200'
    case 'selesai':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'rujuk_luar':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}