import type { CaseStatus } from './case-status'
import { CASE_STATUS_LABELS } from './case-status'

export type StatusChangePayload = {
  toStatus: CaseStatus
  nota?: string
  tarikhSusulan?: string
  agensiRujukan?: string
}

export type StatusChangeFieldErrors = Partial<{
  nota: string
  tarikhSusulan: string
  agensiRujukan: string
}>

/** Medan wajib ikut status sasaran */
export function requiredFieldsForStatus(status: CaseStatus): (keyof StatusChangeFieldErrors)[] {
  switch (status) {
    case 'baru':
      return []
    case 'dalam_tindakan':
      return ['tarikhSusulan']
    case 'susulan':
      return ['nota', 'tarikhSusulan']
    case 'selesai':
      return ['nota']
    case 'rujuk_luar':
      return ['agensiRujukan', 'tarikhSusulan']
    default:
      return []
  }
}

export function validateStatusChange(
  toStatus: CaseStatus,
  payload: Omit<StatusChangePayload, 'toStatus'>
): { ok: true } | { ok: false; errors: StatusChangeFieldErrors } {
  const errors: StatusChangeFieldErrors = {}
  const nota = (payload.nota ?? '').trim()
  const tarikh = (payload.tarikhSusulan ?? '').trim()
  const agensi = (payload.agensiRujukan ?? '').trim()

  if (toStatus === 'dalam_tindakan' && !tarikh) {
    errors.tarikhSusulan = 'Tarikh sesi seterusnya wajib'
  }
  if (toStatus === 'susulan') {
    if (!nota) errors.nota = 'Nota susulan wajib'
    if (!tarikh) errors.tarikhSusulan = 'Tarikh susulan wajib'
  }
  if (toStatus === 'selesai') {
    if (nota.length < 20) errors.nota = 'Ringkasan penutup min 20 aksara'
  }
  if (toStatus === 'rujuk_luar') {
    if (!agensi) errors.agensiRujukan = 'Nama agensi wajib'
    if (!tarikh) errors.tarikhSusulan = 'Tarikh rujuk wajib'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true }
}

export function formatStatusLogLine(args: {
  fromStatus: CaseStatus | null
  toStatus: CaseStatus
  createdAt: string
  counselorName?: string
  nota?: string | null
}): string {
  const from = args.fromStatus ? CASE_STATUS_LABELS[args.fromStatus] : '—'
  const to = CASE_STATUS_LABELS[args.toStatus]
  const date = new Date(args.createdAt).toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const who = args.counselorName ? ` · ${args.counselorName}` : ''
  const note = args.nota ? ` · "${args.nota.slice(0, 80)}${args.nota.length > 80 ? '…' : ''}"` : ''
  return `[${from} → ${to}] · ${date}${who}${note}`
}

export function isCaseOverdue(caseStatus: CaseStatus, tarikhSusulan: string | null | undefined): boolean {
  if (caseStatus !== 'dalam_tindakan' && caseStatus !== 'susulan') return false
  if (!tarikhSusulan) return false
  const d = new Date(tarikhSusulan + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return d < today
}

export function statusChangeHints(status: CaseStatus): string {
  switch (status) {
    case 'baru':
      return 'Tiada maklumat tambahan diperlukan.'
    case 'dalam_tindakan':
      return 'Masukkan tarikh sesi atau tindakan seterusnya.'
    case 'susulan':
      return 'Rekod nota susulan dan tarikh semakan seterusnya.'
    case 'selesai':
      return 'Ringkasan penutup kes (min 20 aksara). Ibu bapa nampak jika kongsi diaktifkan.'
    case 'rujuk_luar':
      return 'Nama agensi/pakar dan tarikh rujukan.'
    default:
      return ''
  }
}