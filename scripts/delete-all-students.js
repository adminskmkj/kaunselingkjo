#!/usr/bin/env node

/**
 * Delete ALL users with @student.skmkj.edu.my email
 * No confirmation needed — bulk operation
 */

const { createClient } = require('@supabase/supabase-js')
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
  // env vars may be set via $env: in PowerShell
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🧹 Deleting ALL student auth users...\n')

  let deleted = 0
  let errors = 0
  let page = 1

  while (true) {
    // List users page by page
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) {
      console.error(`❌ List error: ${error.message}`)
      process.exit(1)
    }

    const users = data.users || []
    if (users.length === 0) break

    for (const user of users) {
      if (user.email && user.email.includes('@student.skmkj.edu.my')) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
        if (delErr) {
          console.log(`   ❌ ${user.email} | ${delErr.message}`)
          errors++
        } else {
          deleted++
          if (deleted % 100 === 0) process.stdout.write(`   ${deleted} deleted...\r`)
        }
      }
    }

    if (users.length < 100) break
    page++
  }

  console.log(`\n✅ Deleted: ${deleted} | ❌ Errors: ${errors}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
