#!/usr/bin/env node
/**
 * Import guru kelas dari SENARAI_ID_PASSWORD_GURU_*.xlsx
 * - Skip Prasekolah / PRA
 * - Map kelas Excel → class_name format murid (TAHUN SATU · AL-FARABI)
 *
 * Usage:
 *   node scripts/import-guru-excel.js "C:/path/to/SENARAI_ID_PASSWORD_GURU_2026_v2.xlsx"
 *   node scripts/import-guru-excel.js "..." --dry-run
 */

const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=')
      if (!process.env[key.trim()]) process.env[key.trim()] = rest.join('=').trim()
    }
  })
} catch (_) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const file = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kaunselingkjo.vercel.app'

if (!file) {
  console.error('Usage: node scripts/import-guru-excel.js <excel> [--dry-run]')
  process.exit(1)
}

const TAHAP_MAP = {
  'tahun 1': 'TAHUN SATU',
  'tahun 2': 'TAHUN DUA',
  'tahun 3': 'TAHUN TIGA',
  'tahun 4': 'TAHUN EMPAT',
  'tahun 5': 'TAHUN LIMA',
  'tahun 6': 'TAHUN ENAM',
}

const KELAS_MAP = {
  'al farabi': 'AL-FARABI',
  'al-farabi': 'AL-FARABI',
  'al jazari': 'AL-JAZARI',
  'al-jazari': 'AL-JAZARI',
  'al razi': 'AL-RAZI',
  'al-razi': 'AL-RAZI',
  'ibn batutah': 'IBN BATUTAH',
  'ibn khaldun': 'IBN KHALDUN',
  'ibn sina': 'IBN SINA',
}

function isPra(tahap, kelas) {
  const t = String(tahap || '').toLowerCase()
  const k = String(kelas || '').toLowerCase()
  return t.includes('pra') || k.startsWith('pra ') || k.includes('prasekolah')
}

/** Excel "1 Al Farabi" / "Tahun 1" → "TAHUN SATU · AL-FARABI" */
function mapClassName(tahap, kelasRaw) {
  const tahapKey = String(tahap || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  const tahun = TAHAP_MAP[tahapKey]
  if (!tahun) return null

  let k = String(kelasRaw || '')
    .trim()
    .replace(/^\d+\s+/, '') // drop leading "1 "
    .replace(/\s+/g, ' ')
    .toLowerCase()

  const mapped = KELAS_MAP[k]
  if (!mapped) return null
  return `${tahun} · ${mapped}`
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

async function listAllAuthUsers() {
  const users = []
  let page = 1
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const batch = data?.users || []
    users.push(...batch)
    if (batch.length < 200) break
    page++
    if (page > 50) break
  }
  return users
}

async function main() {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error('❌ Fail tidak dijumpai:', abs)
    process.exit(1)
  }

  const wb = XLSX.readFile(abs)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const teachers = []
  let skippedPra = 0
  let skippedBad = 0

  for (const r of rows) {
    const tahap = r['Tahap'] || r['TAHAP'] || ''
    const kelas = r['Kelas'] || r['KELAS'] || ''
    const nama = (r['Nama Guru'] || r['NAMA GURU'] || r['Nama'] || '').trim()
    const idLogin = String(r['ID Login'] || r['ID'] || r['Login'] || '')
      .trim()
      .toLowerCase()
    const password = String(r['Password'] || r['password'] || '').trim()

    if (!nama || !idLogin) continue
    if (isPra(tahap, kelas)) {
      skippedPra++
      continue
    }

    const class_name = mapClassName(tahap, kelas)
    if (!class_name) {
      console.warn(`⚠️  Skip (kelas tak map): ${nama} | ${tahap} | ${kelas}`)
      skippedBad++
      continue
    }

    teachers.push({
      email: `${idLogin}@skmkj.edu.my`,
      full_name: nama,
      role: 'class_teacher',
      class_name,
      password: password || `Guru-${idLogin}1010`,
      id_login: idLogin,
      kelas_excel: `${tahap} / ${kelas}`,
    })
  }

  console.log(`📄 Excel: ${rows.length} baris`)
  console.log(`   Skip PRA: ${skippedPra}`)
  console.log(`   Skip map gagal: ${skippedBad}`)
  console.log(`   Import guru: ${teachers.length}`)
  if (dryRun) console.log('👀 Dry-run\n')

  // Load student class counts for verification
  let classCounts = new Map()
  if (!dryRun || true) {
    let all = []
    let from = 0
    for (;;) {
      const { data, error } = await supabase
        .from('profiles')
        .select('class_name')
        .eq('role', 'student')
        .not('class_name', 'is', null)
        .range(from, from + 999)
      if (error) throw error
      all = all.concat(data || [])
      if (!data || data.length < 1000) break
      from += 1000
    }
    for (const r of all) {
      classCounts.set(r.class_name, (classCounts.get(r.class_name) || 0) + 1)
    }
  }

  for (const t of teachers) {
    const n = classCounts.get(t.class_name) || 0
    console.log(
      `  ${t.class_name.padEnd(28)} ${String(n).padStart(3)} murid  | ${t.full_name.slice(0, 40)} | ${t.email}`
    )
  }

  if (dryRun) {
    console.log('\nDry-run siap. Jalankan tanpa --dry-run untuk create akaun.')
    return
  }

  const authUsers = await listAllAuthUsers()
  const byEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u]))

  const slips = []
  let ok = 0
  let fail = 0

  for (const t of teachers) {
    console.log(`\n→ ${t.email} · ${t.class_name}`)
    try {
      const existing = byEmail.get(t.email.toLowerCase())
      let userId
      if (existing) {
        userId = existing.id
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password: t.password,
          email_confirm: true,
          user_metadata: {
            role: t.role,
            full_name: t.full_name,
            class_name: t.class_name,
          },
        })
        if (error) throw error
        console.log('   ♻️  Auth updated')
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: t.email,
          password: t.password,
          email_confirm: true,
          user_metadata: {
            role: t.role,
            full_name: t.full_name,
            class_name: t.class_name,
          },
        })
        if (error) throw error
        userId = data.user.id
        console.log('   ✅ Auth created')
      }

      const { error: pErr } = await supabase.from('profiles').upsert(
        {
          id: userId,
          role: t.role,
          full_name: t.full_name,
          class_name: t.class_name,
          must_change_password: false,
        },
        { onConflict: 'id' }
      )
      if (pErr) throw pErr
      console.log('   ✅ Profile class_teacher')
      slips.push([
        t.full_name,
        t.kelas_excel,
        t.class_name,
        t.email,
        t.id_login,
        t.password,
        appUrl + '/login',
        classCounts.get(t.class_name) || 0,
      ])
      ok++
    } catch (e) {
      fail++
      console.error(`   ❌ ${e.message}`)
    }
  }

  const dir = path.resolve(__dirname, '..', 'tmp')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const out = path.join(dir, `slip-password-guru-${stamp}.csv`)
  const header = [
    'nama',
    'kelas_excel',
    'class_name_sistem',
    'email_login',
    'id_login_asal',
    'password',
    'url',
    'bil_murid_kelas',
  ]
  fs.writeFileSync(
    out,
    [header.join(','), ...slips.map((r) => r.map(csvEscape).join(','))].join('\n'),
    'utf8'
  )

  console.log(`\n✅ OK ${ok}, gagal ${fail}`)
  console.log(`📄 Slip: ${out}`)
  console.log('Login guru: EMAIL (cth 1farabi@skmkj.edu.my) + password dari Excel.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
