import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Build-time optional, runtime required
function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}
const DEFAULT_PASSWORD = 'skmkj@1010.murid1234'

function extractIC6Digit(icFull: string): string {
  const cleaned = String(icFull).replace(/[^0-9]/g, '')
  return cleaned.length >= 6 ? cleaned.slice(-6) : cleaned
}

type StudentData = {
  full_name: string
  ic_full: string
  ic_6_digit: string
  class_name: string
  email: string
}

function parseExcel(buffer: Buffer): StudentData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const students: StudentData[] = []

  for (const row of rows as Record<string, unknown>[]) {
    const nama = String(row['NAMA'] || row['Nama'] || '').trim()
    const icFull = String(row['NO. PENGENALAN'] || row['No. Pengenalan'] || '').trim()
    const kelas = String(row['NAMA KELAS'] || row['Nama Kelas'] || '').trim()

    if (!nama || !icFull) continue

    const ic6 = extractIC6Digit(icFull)
    if (!ic6 || ic6.length < 6) continue

    students.push({
      full_name: nama,
      ic_full: icFull,
      ic_6_digit: ic6,
      class_name: kelas || 'Tiada Kelas',
      email: `${ic6}@student.smkkj.edu.my`,
    })
  }

  return students
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

    // Check admin auth
    const authHeader = req.headers.get('cookie')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse Excel
    const excelStudents = parseExcel(buffer)

    if (excelStudents.length === 0) {
      return NextResponse.json({ error: 'No valid students found in Excel' }, { status: 400 })
    }

    // Fetch existing students
    const { data: dbStudents, error: fetchError } = await supabase
      .from('profiles')
      .select('id, ic_or_student_id, class_name')
      .eq('role', 'student')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const dbMap = new Map(dbStudents?.map((s) => [s.ic_or_student_id, s]) || [])

    let created = 0
    let updated = 0
    let errors = 0

    // Process students
    for (const student of excelStudents) {
      const existing = dbMap.get(student.ic_6_digit)

      if (!existing) {
        // Create new student
        try {
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
            console.error(`Auth error for ${student.ic_6_digit}:`, authError.message)
            errors++
            continue
          }

          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            role: 'student',
            full_name: student.full_name,
            class_name: student.class_name,
            ic_or_student_id: student.ic_6_digit,
            must_change_password: false,
          })

          if (profileError) {
            console.error(`Profile error for ${student.ic_6_digit}:`, profileError.message)
            errors++
          } else {
            created++
          }
        } catch (err) {
          console.error(`Error creating ${student.ic_6_digit}:`, err)
          errors++
        }
      } else if (existing.class_name !== student.class_name) {
        // Update class
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ class_name: student.class_name })
          .eq('id', existing.id)

        if (updateError) {
          console.error(`Update error for ${student.ic_6_digit}:`, updateError.message)
          errors++
        } else {
          updated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      total: excelStudents.length,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
