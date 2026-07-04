/** CJS twin of lib/class-name.ts for upload-murid.js */
function normalizeKelasName(raw) {
  let k = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!k) return 'Tiada Kelas'
  k = k.replace(/^AL\s+FARABI$/i, 'AL-FARABI')
  k = k.replace(/^AL\s+JAZARI$/i, 'AL-JAZARI')
  k = k.replace(/^AL\s+RAZI$/i, 'AL-RAZI')
  return k
}

function buildClassName(tingkatan, namaKelas) {
  const t = String(tingkatan || '').trim().replace(/\s+/g, ' ')
  const k = normalizeKelasName(namaKelas)
  if (!t) return k
  if (k === 'Tiada Kelas') return t
  return `${t} · ${k}`
}

module.exports = { normalizeKelasName, buildClassName }