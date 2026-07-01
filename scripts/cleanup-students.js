#!/usr/bin/env node

/**
 * Cleanup: delete all student users from Supabase
 * Usage: node scripts/cleanup-students.js
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

// Load env
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
} catch (e) {
  console.error('❌ Cannot read .env.local:', e.message)
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Run: $env:NEXT_PUBLIC_SUPABASE_URL="..." ; $env:SUPABASE_SERVICE_ROLE_KEY="..."')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🧹 S.T.A.R KJo - Cleanup Students\n')

  // Step 1: Delete all student profiles
  console.log('🔍 Finding student profiles...')
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, full_name, ic_or_student_id')
    .eq('role', 'student')

  if (fetchError) {
    console.error('❌ Fetch error:', fetchError.message)
    process.exit(1)
  }

  console.log(`📋 Found ${profiles.length} student profiles`)

  if (profiles.length === 0) {
    console.log('✅ No students to delete.')
    process.exit(0)
  }

  // Show sample
  console.log('\nSample:')
  profiles.slice(0, 5).forEach(s => {
    console.log(`   ${s.ic_or_student_id} | ${s.full_name}`)
  })
  if (profiles.length > 5) console.log(`   ... and ${profiles.length - 5} more`)

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(resolve => {
    rl.question(`\n⚠️  Delete ALL ${profiles.length} students? (yes/no): `, resolve)
  })
  rl.close()

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('❌ Cancelled.')
    process.exit(0)
  }

  // Step 1: Delete profiles
  console.log('\n🗑️  Deleting profiles...')
  const { error: deleteProfileError } = await supabase
    .from('profiles')
    .delete()
    .eq('role', 'student')

  if (deleteProfileError) {
    console.error('❌ Profile delete error:', deleteProfileError.message)
    process.exit(1)
  }
  console.log(`✅ ${profiles.length} profiles deleted`)

  // Step 2: Delete auth users
  console.log('\n🗑️  Deleting auth users...')
  let deleted = 0
  let failed = 0

  for (const p of profiles) {
    const { error: authError } = await supabase.auth.admin.deleteUser(p.id)
    if (authError) {
      console.log(`   ❌ ${p.ic_or_student_id} | ${authError.message}`)
      failed++
    } else {
      deleted++
      if (deleted % 50 === 0) console.log(`   ${deleted}/${profiles.length}...`)
    }
  }

  console.log(`\n✅ Auth users deleted: ${deleted} | ❌ Failed: ${failed}`)
  console.log('\n🎉 Cleanup complete! Ready to re-upload.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
