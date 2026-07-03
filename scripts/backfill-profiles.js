#!/usr/bin/env node
/**
 * Backfill missing public.profiles rows from Supabase Auth users.
 *
 * Usage:
 *   node scripts/backfill-profiles.js
 *   node scripts/backfill-profiles.js --force-student-reset
 *
 * Notes:
 * - Uses SUPABASE_SERVICE_ROLE_KEY; run locally/server-side only.
 * - Does not guess staff roles. Staff without metadata are reported for manual fix.
 * - Student users are inferred from {12_digit_ic}@student.skmkj.edu.my when metadata is missing.
 */

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
const forceStudentReset = process.argv.includes('--force-student-reset')

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function inferProfile(user) {
  const meta = user.user_metadata || {}
  const email = (user.email || '').toLowerCase()
  const studentMatch = email.match(/^(\d{12})@student\.skmkj\.edu\.my$/)

  const role = meta.role || (studentMatch ? 'student' : null)
  if (!role) return null

  return {
    id: user.id,
    role,
    full_name: meta.full_name || email,
    class_name: meta.class_name || null,
    ic_or_student_id: meta.ic_or_student_id || (studentMatch ? studentMatch[1] : null),
    must_change_password: forceStudentReset && role === 'student'
      ? true
      : Boolean(meta.must_change_password),
  }
}

async function listAllUsers() {
  const users = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    users.push(...(data.users || []))
    if (!data.users || data.users.length < perPage) break
    page++
  }

  return users
}

async function main() {
  console.log('🔎 Backfilling profiles from auth.users...')
  if (forceStudentReset) {
    console.log('🔐 Existing students created/updated by this script will be flagged must_change_password=true')
  }

  const users = await listAllUsers()
  const { data: existingProfiles, error: profileListError } = await supabase
    .from('profiles')
    .select('id')

  if (profileListError) throw profileListError

  const existingIds = new Set((existingProfiles || []).map((p) => p.id))
  let created = 0
  let skipped = 0
  let manual = 0
  let errors = 0

  for (const user of users) {
    if (existingIds.has(user.id)) {
      skipped++
      continue
    }

    const profile = inferProfile(user)
    if (!profile) {
      manual++
      console.log(`⚠️  Manual role needed: ${user.email || user.id}`)
      continue
    }

    const { error } = await supabase.from('profiles').insert(profile)
    if (error) {
      errors++
      console.error(`❌ ${user.email || user.id}: ${error.message}`)
    } else {
      created++
      console.log(`✅ ${user.email || user.id} → ${profile.role}`)
    }
  }

  console.log('\nDone.')
  console.log(`Created: ${created}`)
  console.log(`Skipped existing: ${skipped}`)
  console.log(`Manual review: ${manual}`)
  console.log(`Errors: ${errors}`)

  if (manual > 0) {
    console.log('\nTip: for staff accounts, rerun scripts/create-staff.js with password env vars so role metadata/profile is set.')
  }
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err)
  process.exit(1)
})
