#!/usr/bin/env node
/**
 * Create GBK / Guru / Admin staff accounts (Auth + profiles)
 * Usage:
 *   $env:ASHRAF_PASSWORD="..."
 *   $env:TASHA_PASSWORD="..."
 *   node scripts/create-staff.js
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
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim()
      }
    }
  })
} catch (_) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

/** Passwords dibaca dari env — JANGAN hardcode di sini */
const STAFF = [
  {
    email: 'ashraf@skmkj.edu.my',
    password: process.env.ASHRAF_PASSWORD,
    role: 'counselor',
    full_name: 'Ashraf (GBK)',
    class_name: null,
  },
  {
    email: 'tasha@skmkj.edu.my',
    password: process.env.TASHA_PASSWORD,
    role: 'counselor',
    full_name: 'Tasha (GBK)',
    class_name: null,
  },
]

// Validate passwords dari env
for (const s of STAFF) {
  if (!s.password) {
    console.error(`❌ Password untuk ${s.email} tidak ditemui.`)
    console.error(`   Set env: $env:${s.email.split('@')[0].toUpperCase()}_PASSWORD="kata_laluan_baru"`)
    process.exit(1)
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function upsertStaff(member) {
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = (list?.users || []).find(u => u.email?.toLowerCase() === member.email.toLowerCase())

  let userId
  if (existing) {
    userId = existing.id
    await supabase.auth.admin.updateUserById(userId, {
      password: member.password,
      user_metadata: { role: member.role, full_name: member.full_name, class_name: member.class_name },
    })
    console.log(`   ♻️  Auth exists: ${member.email} (password + metadata updated)`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
      user_metadata: { role: member.role, full_name: member.full_name, class_name: member.class_name },
    })
    if (error) throw new Error(`Auth: ${error.message}`)
    userId = data.user.id
    console.log(`   ✅ Auth created: ${member.email}`)
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      role: member.role,
      full_name: member.full_name,
      class_name: member.class_name,
      ic_or_student_id: null,
      must_change_password: false,
    },
    { onConflict: 'id' }
  )

  if (profileError) throw new Error(`Profile: ${profileError.message}`)
  console.log(`   ✅ Profile role=${member.role}`)
}

async function main() {
  console.log('👤 Creating staff accounts...\n')
  for (const m of STAFF) {
    console.log(`→ ${m.email} (${m.role})`)
    try {
      await upsertStaff(m)
    } catch (e) {
      console.error(`   ❌ ${e.message}`)
    }
    console.log('')
  }
  console.log('Done. Passwords were read from env and not printed.')
  console.log('Login at /login with email + password.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
