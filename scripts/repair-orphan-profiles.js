#!/usr/bin/env node
/**
 * Fix Auth users that have no profiles row (common after failed upload or manual Auth-only create)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=')
      process.env[key.trim()] = rest.join('=').trim()
    }
  })
} catch (_) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Set env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listAllAuthUsers() {
  const all = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 500 })
    if (error) throw error
    const users = data.users || []
    all.push(...users)
    if (users.length < 500) break
    page++
  }
  return all
}

async function main() {
  console.log('🔍 Scanning orphan Auth users (no profiles)...\n')

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id')
  if (pErr) throw pErr
  const profileIds = new Set((profiles || []).map(p => p.id))

  const authUsers = await listAllAuthUsers()
  const orphans = authUsers.filter(u => !profileIds.has(u.id))

  if (orphans.length === 0) {
    console.log('✅ Tiada orphan — semua Auth user ada profil.')
    return
  }

  console.log(`Found ${orphans.length} orphan(s)\n`)

  let fixed = 0
  let skipped = 0

  for (const u of orphans) {
    const email = u.email || ''
    const meta = u.user_metadata || {}

    if (email.includes('@student.skmkj.edu.my')) {
      const ic = email.split('@')[0]
      const { error } = await supabase.from('profiles').insert({
        id: u.id,
        role: 'student',
        full_name: meta.full_name || `Murid ${ic}`,
        class_name: meta.class_name || null,
        ic_or_student_id: meta.ic_6_digit || ic,
        must_change_password: false,
      })
      if (error) {
        console.log(`   ❌ ${email} | ${error.message}`)
        skipped++
      } else {
        console.log(`   ✅ student | ${email}`)
        fixed++
      }
      continue
    }

    console.log(`   ⚠️  SKIP (bukan murid auto): ${email}`)
    console.log(`      → node scripts/ensure-user-profile.js "${email}" counselor "Nama GBK"`)
    skipped++
  }

  console.log(`\n✅ Fixed: ${fixed} | ⚠️ Manual: ${skipped}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})