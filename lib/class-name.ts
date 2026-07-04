/**
 * Build stable class_name from KPM JBA1010 columns.
 * Example: TAHUN SATU + AL FARABI → "TAHUN SATU · AL-FARABI"
 */
export function normalizeKelasName(raw: string): string {
  let k = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!k) return 'Tiada Kelas'
  // Standardise AL FARABI / AL JAZARI / AL RAZI → AL-FARABI style
  k = k.replace(/^AL\s+FARABI$/i, 'AL-FARABI')
  k = k.replace(/^AL\s+JAZARI$/i, 'AL-JAZARI')
  k = k.replace(/^AL\s+RAZI$/i, 'AL-RAZI')
  return k
}

export function buildClassName(tingkatan: string, namaKelas: string): string {
  const t = String(tingkatan || '').trim().replace(/\s+/g, ' ')
  const k = normalizeKelasName(namaKelas)
  if (!t) return k
  if (k === 'Tiada Kelas') return t
  return `${t} · ${k}`
}