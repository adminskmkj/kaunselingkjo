#!/usr/bin/env node
/**
 * Jana / reset password sementara + export slip CSV.
 *
 * Murid:
 *   node scripts/export-password-slips.js --murid --confirm
 *
 * Staff (GBK / guru / admin yang role staff):
 *   node scripts/export-password-slips.js --staff --confirm
 *
 * Kedua-dua:
 *   node scripts/export-password-slips.js --all --confirm
 *
 * Dry-run (senarai sahaja, tak reset password):
 *   node scripts/export-password-slips.js --murid
 *
 * Slip ditulis ke tmp/ (gitignored). Jangan commit.
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
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
} catch (e) {
  console.error('❌ Cannot read .env.local:', e.message)
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const args = process.argv.slice(2)
const doMurid = args.includes('--murid') || args.includes('--all')
const doStaff = args.includes('--staff') || args.includes('--all')
const confirm = args.includes('--confirm')
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kaunselingkjo.vercel.app'

if (!doMurid && !doStaff) {
  console.log(`Usage:
  node scripts/export-password-slips.js --murid [--confirm]
  node scripts/export-password-slips.js --staff [--confirm]
  node scripts/export-password-slips.js --all [--confirm]

Tanpa --confirm = dry-run (senarai bilangan sahaja).
Dengan --confirm = reset password + tulis CSV di tmp/
`)
  process.exit(0)
}

function tempPassword(prefix) {
  return `${prefix}-${crypto.randomBytes(5).toString('base64url')}`
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function writeCsv(filename, header, rows) {
  const dir = path.resolve(__dirname, '..', 'tmp')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.join(dir, `${filename}-${stamp}.csv`)
  const lines = [header.join(','), ...rows.map((r) => r.map(csvEscape).join(','))]
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
  return outPath
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
    page += 1
    if (page > 50) break
  }
  return users
}

async function fetchAllProfiles(roleFilter) {
  const list = []
  const pageSize = 1000
  let from = 0
  for (;;) {
    let q = supabase
      .from('profiles')
      .select('id, full_name, class_name, ic_or_student_id, ic_number, role')
      .order('full_name')
      .range(from, from + pageSize - 1)
    if (Array.isArray(roleFilter)) q = q.in('role', roleFilter)
    else if (roleFilter) q = q.eq('role', roleFilter)
    const { data, error } = await q
    if (error) throw error
    const batch = data || []
    list.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return list
}

async function exportMurid() {
  console.log('\n📚 Murid...')
  const list = await fetchAllProfiles('student')
  console.log(`   Jumpa ${list.length} murid dalam profiles.`)

  if (!confirm) {
    console.log('   Dry-run: tambah --confirm untuk reset password + CSV.')
    return
  }

  const authUsers = await listAllAuthUsers()
  const byId = new Map(authUsers.map((u) => [u.id, u]))
  const rows = []
  let ok = 0
  let fail = 0

  for (const p of list) {
    const password = tempPassword('KJo')
    const auth = byId.get(p.id)
    const loginId = p.ic_number || p.ic_or_student_id || (auth?.email || '').split('@')[0] || ''

    try {
      if (!auth) {
        // create auth if missing
        const email = `${loginId}@student.skmkj.edu.my`
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: 'student', full_name: p.full_name },
        })
        if (cErr) throw cErr
        // if new auth id differs, profile already bound — rare; skip rebind
        if (created.user.id !== p.id) {
          console.warn(`   ⚠️  ${p.full_name}: auth id mismatch, skip rebind`)
        }
      } else {
        const { error: uErr } = await supabase.auth.admin.updateUserById(p.id, {
          password,
          user_metadata: { ...(auth.user_metadata || {}), role: 'student', full_name: p.full_name },
        })
        if (uErr) throw uErr
      }

      await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', p.id)

      rows.push([
        p.full_name,
        p.class_name || '',
        loginId,
        password,
        appUrl + '/login',
        'IC 12 digit (No. Pengenalan) + password sementara. Tukar password pada login pertama.',
      ])
      ok++
      if (ok % 25 === 0) console.log(`   ... ${ok}/${list.length}`)
    } catch (e) {
      fail++
      console.error(`   ❌ ${p.full_name}: ${e.message}`)
    }
  }

  const out = writeCsv(
    'slip-password-murid',
    ['nama', 'kelas', 'login_ic', 'password_sementara', 'url_login', 'nota'],
    rows
  )
  console.log(`   ✅ OK ${ok}, gagal ${fail}`)
  console.log(`   📄 Slip: ${out}`)
}

async function exportStaff() {
  console.log('\n👔 Staff (GBK / guru / admin)...')
  const list = await fetchAllProfiles([
    'counselor',
    'class_teacher',
    'discipline_teacher',
    'admin',
  ])
  list.sort((a, b) => String(a.role).localeCompare(b.role) || String(a.full_name).localeCompare(b.full_name))
  console.log(`   Jumpa ${list.length} staff.`)

  if (!confirm) {
    for (const p of list) {
      console.log(`   - ${p.role.padEnd(20)} ${p.full_name}${p.class_name ? ` · ${p.class_name}` : ''}`)
    }
    console.log('   Dry-run: tambah --confirm untuk reset password + CSV.')
    return
  }

  const authUsers = await listAllAuthUsers()
  const byId = new Map(authUsers.map((u) => [u.id, u]))
  const rows = []
  let ok = 0
  let fail = 0

  for (const p of list) {
    const password = tempPassword('Staff')
    const auth = byId.get(p.id)
    const email = auth?.email || ''

    try {
      if (!auth) {
        console.warn(`   ⚠️  ${p.full_name}: tiada Auth user, skip`)
        fail++
        continue
      }
      const { error: uErr } = await supabase.auth.admin.updateUserById(p.id, {
        password,
        user_metadata: {
          ...(auth.user_metadata || {}),
          role: p.role,
          full_name: p.full_name,
          class_name: p.class_name,
        },
      })
      if (uErr) throw uErr

      rows.push([
        p.full_name,
        p.role,
        p.class_name || '',
        email,
        password,
        appUrl + '/login',
        'Login guna email + password. Jangan kongsi slip.',
      ])
      ok++
    } catch (e) {
      fail++
      console.error(`   ❌ ${p.full_name}: ${e.message}`)
    }
  }

  const out = writeCsv(
    'slip-password-staff',
    ['nama', 'peranan', 'kelas', 'email', 'password_sementara', 'url_login', 'nota'],
    rows
  )
  console.log(`   ✅ OK ${ok}, gagal ${fail}`)
  console.log(`   📄 Slip: ${out}`)
}

async function main() {
  console.log(confirm ? '🔐 CONFIRM mode — akan reset password' : '👀 Dry-run mode')
  console.log(`   App: ${appUrl}`)
  if (doMurid) await exportMurid()
  if (doStaff) await exportStaff()
  console.log('\nDone.')
  if (confirm) {
    console.log('⚠️  Cetak/edar slip, kemudian padam fail digital di tmp/ bila selesai.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
