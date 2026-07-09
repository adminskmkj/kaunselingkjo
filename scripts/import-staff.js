#!/usr/bin/env node
/**
 * Import / create staff dari CSV (GBK, guru kelas, disiplin, admin).
 *
 * Template: scripts/templates/staff.csv
 *
 * Columns:
 *   email, full_name, role, class_name, password
 *
 * role: counselor | class_teacher | discipline_teacher | admin
 * class_name: wajib untuk class_teacher (mesti match murid, cth: "TAHUN SATU · AL-FARABI")
 * password: optional — jika kosong, jana automatic + tulis ke slip
 *
 * Usage:
 *   node scripts/import-staff.js scripts/templates/staff.csv
 *   node scripts/import-staff.js path/to/staff.csv --dry-run
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
} catch (_) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing env Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const file = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kaunselingkjo.vercel.app'

if (!file) {
  console.error('Usage: node scripts/import-staff.js <staff.csv> [--dry-run]')
  process.exit(1)
}

const VALID = new Set(['counselor', 'class_teacher', 'discipline_teacher', 'admin'])

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'))
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line)
    const row = {}
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').trim()
    })
    return row
  })
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQ = !inQ
    } else if (c === ',' && !inQ) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

function tempPassword() {
  return `Staff-${crypto.randomBytes(5).toString('base64url')}`
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

  const rows = parseCsv(fs.readFileSync(abs, 'utf8'))
  console.log(`📄 ${rows.length} baris dari ${abs}`)
  if (dryRun) console.log('👀 Dry-run — tiada tulis ke DB\n')

  const authUsers = dryRun ? [] : await listAllAuthUsers()
  const byEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u]))

  const slips = []
  let ok = 0
  let fail = 0

  for (const r of rows) {
    const email = (r.email || '').toLowerCase()
    const full_name = r.full_name || r.nama || ''
    const role = (r.role || r.peranan || '').toLowerCase()
    const class_name = (r.class_name || r.kelas || '').trim() || null
    let password = r.password || ''

    if (!email || !full_name || !VALID.has(role)) {
      console.error(`   ❌ Skip baris tak sah:`, r)
      fail++
      continue
    }
    if (role === 'class_teacher' && !class_name) {
      console.error(`   ❌ ${full_name}: class_teacher mesti ada class_name`)
      fail++
      continue
    }
    if (!password) password = tempPassword()

    console.log(`→ ${email} | ${role}${class_name ? ` | ${class_name}` : ''}`)
    if (dryRun) {
      slips.push([full_name, role, class_name || '', email, password, appUrl + '/login'])
      ok++
      continue
    }

    try {
      const existing = byEmail.get(email)
      let userId
      if (existing) {
        userId = existing.id
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { role, full_name, class_name: class_name || null },
        })
        if (error) throw error
        console.log('   ♻️  Auth updated')
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role, full_name, class_name: class_name || null },
        })
        if (error) throw error
        userId = data.user.id
        console.log('   ✅ Auth created')
      }

      const { error: pErr } = await supabase.from('profiles').upsert(
        {
          id: userId,
          role,
          full_name,
          class_name: class_name || null,
          must_change_password: false,
        },
        { onConflict: 'id' }
      )
      if (pErr) throw pErr
      console.log('   ✅ Profile upserted')
      slips.push([full_name, role, class_name || '', email, password, appUrl + '/login'])
      ok++
    } catch (e) {
      fail++
      console.error(`   ❌ ${e.message}`)
    }
  }

  if (slips.length) {
    const dir = path.resolve(__dirname, '..', 'tmp')
    fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const out = path.join(dir, `slip-password-staff-import-${stamp}.csv`)
    const header = ['nama', 'peranan', 'kelas', 'email', 'password', 'url_login']
    fs.writeFileSync(
      out,
      [header.join(','), ...slips.map((r) => r.map(csvEscape).join(','))].join('\n'),
      'utf8'
    )
    console.log(`\n📄 Slip: ${out}`)
  }

  console.log(`\nDone. OK ${ok}, gagal ${fail}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
