#!/usr/bin/env node

/**
 * Upload/sync students from KPM Excel (JBA1010 format) to Supabase
 * Usage: node scripts/upload-murid.js <path-to-excel>
 */

const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// Load env
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DEFAULT_PASSWORD = 'skmkj@1010.murid1234'

function extractIC6Digit(icFull) {
  // IC format: YYMMDDPBXXXX
  // Ambil 6 digit akhir: PBXXXX
  const cleaned = String(icFull).replace(/[^0-9]/g, '')
  if (cleaned.length >= 6) {
    return cleaned.slice(-6)
  }
  return cleaned // fallback
}

function parseExcel(filePath) {
  console.log(`📖 Reading ${filePath}...`)
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const students = []

  // Header KPM biasanya baris 7 (row index 6), data mula baris 8
  // Tapi XLSX parse dah ada header, cuma kena check mana baris data sebenar
  const dataRows = rows.filter((row) => {
    const nama = row['NAMA'] || row['Nama'] || ''
    const ic = row['NO. PENGENALAN'] || row['No. Pengenalan'] || ''
    return nama.trim() && ic.toString().trim()
  })

  for (const row of dataRows) {
    const nama = (row['NAMA'] || row['Nama'] || '').trim()
    const icFull = (row['NO. PENGENALAN'] || row['No. Pengenalan'] || '').toString().trim()
    const kelas = (row['NAMA KELAS'] || row['Nama Kelas'] || '').trim()
    const jantina = (row['JANTINA'] || row['Jantina'] || '').trim().toUpperCase()

    if (!nama || !icFull) continue

    const ic6 = extractIC6Digit(icFull)
    if (!ic6 || ic6.length < 6) {
      console.warn(`⚠️  Skip ${nama}: IC tidak sah (${icFull})`)
      continue
    }

    students.push({
      full_name: nama,
      ic_full: icFull,
      ic_6_digit: ic6,
      class_name: kelas || 'Tiada Kelas',
      jantina: jantina === 'LELAKI' ? 'L' : jantina === 'PEREMPUAN' ? 'P' : 'L',
      email: `${ic6}@student.smkkj.edu.my`,
    })
  }

  console.log(`✅ Parsed ${students.length} students from Excel\n`)
  return students
}

async function fetchExistingStudents() {
  console.log('🔍 Fetching existing students from Supabase...')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, ic_or_student_id, full_name, class_name')
    .eq('role', 'student')

  if (error) {
    console.error('❌ Error fetching students:', error.message)
    return []
  }

  console.log(`✅ Found ${data.length} existing students in DB\n`)
  return data
}

function computeDiff(excelStudents, dbStudents) {
  const dbMap = new Map()
  dbStudents.forEach((s) => {
    if (s.ic_or_student_id) {
      dbMap.set(s.ic_or_student_id, s)
    }
  })

  const toCreate = []
  const toUpdate = []

  excelStudents.forEach((excel) => {
    const existing = dbMap.get(excel.ic_6_digit)
    if (!existing) {
      toCreate.push(excel)
    } else {
      // Check if kelas berubah
      if (existing.class_name !== excel.class_name) {
        toUpdate.push({ ...excel, db_id: existing.id })
      }
      dbMap.delete(excel.ic_6_digit)
    }
  })

  // Yang tinggal dalam dbMap = murid dalam DB tapi tak ada dalam Excel (pindah/keluar)
  const toDelete = Array.from(dbMap.values())

  return { toCreate, toUpdate, toDelete }
}

function showPreview(diff) {
  console.log('═══════════════════════════════════════')
  console.log('📊 PREVIEW CHANGES')
  console.log('═══════════════════════════════════════\n')

  console.log(`🆕 NEW STUDENTS (${diff.toCreate.length}):`)
  diff.toCreate.slice(0, 5).forEach((s) => {
    console.log(`   ${s.ic_6_digit} | ${s.full_name} | ${s.class_name}`)
  })
  if (diff.toCreate.length > 5) {
    console.log(`   ... and ${diff.toCreate.length - 5} more\n`)
  } else {
    console.log()
  }

  console.log(`🔄 UPDATE CLASS (${diff.toUpdate.length}):`)
  diff.toUpdate.slice(0, 5).forEach((s) => {
    console.log(`   ${s.ic_6_digit} | ${s.full_name} | ${s.class_name}`)
  })
  if (diff.toUpdate.length > 5) {
    console.log(`   ... and ${diff.toUpdate.length - 5} more\n`)
  } else {
    console.log()
  }

  console.log(`❌ NOT IN EXCEL (${diff.toDelete.length}) - akan diabaikan (no delete):`)
  diff.toDelete.slice(0, 5).forEach((s) => {
    console.log(`   ${s.ic_or_student_id} | ${s.full_name} | ${s.class_name}`)
  })
  if (diff.toDelete.length > 5) {
    console.log(`   ... and ${diff.toDelete.length - 5} more\n`)
  } else {
    console.log()
  }

  console.log('═══════════════════════════════════════\n')
}

async function confirmProceed() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('Proceed with changes? (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function createStudents(students) {
  console.log(`\n🚀 Creating ${students.length} new students...`)

  let successCount = 0
  let errorCount = 0

  for (const student of students) {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: student.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: student.full_name,
          ic_6_digit: student.ic_6_digit,
        },
      })

      if (authError) {
        console.error(`   ❌ ${student.ic_6_digit} | ${student.full_name} | Auth error: ${authError.message}`)
        errorCount++
        continue
      }

      // 2. Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        role: 'student',
        full_name: student.full_name,
        class_name: student.class_name,
        ic_or_student_id: student.ic_6_digit,
        must_change_password: true,
      })

      if (profileError) {
        console.error(`   ❌ ${student.ic_6_digit} | ${student.full_name} | Profile error: ${profileError.message}`)
        errorCount++
      } else {
        console.log(`   ✅ ${student.ic_6_digit} | ${student.full_name}`)
        successCount++
      }
    } catch (err) {
      console.error(`   ❌ ${student.ic_6_digit} | ${student.full_name} | ${err.message}`)
      errorCount++
    }
  }

  console.log(`\n✅ Created: ${successCount} | ❌ Errors: ${errorCount}`)
}

async function updateStudents(students) {
  if (students.length === 0) return

  console.log(`\n🔄 Updating ${students.length} students...`)

  let successCount = 0
  let errorCount = 0

  for (const student of students) {
    const { error } = await supabase
      .from('profiles')
      .update({ class_name: student.class_name })
      .eq('id', student.db_id)

    if (error) {
      console.error(`   ❌ ${student.ic_6_digit} | ${student.full_name} | ${error.message}`)
      errorCount++
    } else {
      console.log(`   ✅ ${student.ic_6_digit} | ${student.full_name} → ${student.class_name}`)
      successCount++
    }
  }

  console.log(`\n✅ Updated: ${successCount} | ❌ Errors: ${errorCount}`)
}

async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: node scripts/upload-murid.js <path-to-excel>')
    process.exit(1)
  }

  console.log('═══════════════════════════════════════')
  console.log('📚 S.T.A.R KJo - Upload Murid dari Excel')
  console.log('═══════════════════════════════════════\n')

  const excelStudents = parseExcel(filePath)
  const dbStudents = await fetchExistingStudents()
  const diff = computeDiff(excelStudents, dbStudents)

  showPreview(diff)

  const proceed = await confirmProceed()
  if (!proceed) {
    console.log('❌ Cancelled by user.')
    process.exit(0)
  }

  await createStudents(diff.toCreate)
  await updateStudents(diff.toUpdate)

  console.log('\n✅ DONE!\n')
  console.log('Nota: Murid yang tidak ada dalam Excel TIDAK didelete automatically.')
  console.log('Untuk delete manual, guna Supabase dashboard atau script berasingan.\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
