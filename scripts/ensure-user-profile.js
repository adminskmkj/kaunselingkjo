#!/usr/bin/env node
/**
 * Create/update profiles row for an existing Auth user (by email)
 * Usage:
 *   node scripts/ensure-user-profile.js gbk@skmkj.edu.my counselor "GBK Ashraf"
 *   node scripts/ensure-user-profile.js admin@skmkj.edu.my admin "Pentadbir"
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const VALID_ROLES = [
  'student',
  'class_teacher',
  'discipline_teacher',
  'counselor',
  'admin',
  'parent',
]

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
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const [email, role, fullName, className] = process.argv.slice(2)

if (!email || !role || !fullName) {
  console.log('Usage: node scripts/ensure-user-profile.js <email> <role> "<full_name>" [class_name]')
  console.log('Roles:', VALID_ROLES.join(', '))
  process.exit(1)
}

if (!VALID_ROLES.includes(role)) {
  console.error('❌ Invalid role:', role)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findUserByEmail(targetEmail) {
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 500 })
    if (error) throw error
    const users = data.users || []
    const hit = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase())
    if (hit) return hit
    if (users.length < 500) break
    page++
  }
  return null
}

async function main() {
  console.log(`🔧 Link profile for ${email} → role=${role}\n`)

  const authUser = await findUserByEmail(email)
  if (!authUser) {
    console.error(`❌ Tiada user Auth dengan email: ${email}`)
    console.error('   Create user dulu (create-staff.js atau Supabase Auth → Add user)')
    process.exit(1)
  }

  const row = {
    id: authUser.id,
    role,
    full_name: fullName,
    class_name: className || null,
    ic_or_student_id: role === 'student' ? authUser.email?.split('@')[0] || null : null,
    must_change_password: false,
  }

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  if (error) {
    console.error('❌ Profile upsert failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Profil siap. UUID:', authUser.id)
  console.log('   Login semula di /login')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})