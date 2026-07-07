import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'star-kjo-admin-2026'

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

function genPassword() {
  return `KJo-${randomBytes(5).toString('base64url')}`
}

// ponytail: RPC create staff via service_role (bypass RLS). Frontend just calls this.
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-admin-key')
    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'list') {
      return await listStaff()
    }
    if (action === 'create') {
      return await createStaff(body)
    }
    if (action === 'reset_password') {
      return await resetPassword(body)
    }
    if (action === 'delete') {
      return await deleteStaff(body)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

async function listStaff() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, class_name, must_change_password, created_at')
    .in('role', ['counselor', 'class_teacher', 'discipline_teacher', 'admin'])
    .order('role')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get emails from auth.users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailMap = new Map((authUsers?.users || []).map((u) => [u.id, u.email]))

  const staff = (data || []).map((s: { id: string; full_name: string; role: string; class_name: string | null; must_change_password: boolean; created_at: string }) => ({
    ...s,
    email: emailMap.get(s.id) || '-',
  }))

  return NextResponse.json({ staff })
}

async function createStaff(body: {
  email: string
  full_name: string
  role: string
  class_name?: string | null
  password?: string
}) {
  const supabase = getSupabase()
  const email = String(body.email || '').trim().toLowerCase()
  const full_name = String(body.full_name || '').trim()
  const role = String(body.role || '').trim()
  const class_name = body.class_name ? String(body.class_name).trim() : null

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'Email, nama, dan peranan wajib' }, { status: 400 })
  }

  const validRoles = ['counselor', 'class_teacher', 'discipline_teacher', 'admin']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Peranan tidak sah' }, { status: 400 })
  }

  const password = body.password || genPassword()

  // Check existing
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = (list?.users || []).find((u) => u.email?.toLowerCase() === email)

  let userId: string
  if (existing) {
    userId = existing.id
    await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { role, full_name, class_name },
    })
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name, class_name },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user!.id
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      role,
      full_name,
      class_name,
      ic_or_student_id: null,
      must_change_password: false,
    },
    { onConflict: 'id' }
  )

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Insert audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: `STAFF_CREATED: ${email} (${role})`,
  })

  return NextResponse.json({ ok: true, email, password, created: !existing })
}

async function resetPassword(body: { user_id: string }) {
  const supabase = getSupabase()
  const userId = String(body.user_id || '')

  if (!userId) return NextResponse.json({ error: 'user_id wajib' }, { status: 400 })

  const password = genPassword()
  const { error } = await supabase.auth.admin.updateUserById(userId, { password })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: `PASSWORD_RESET by admin`,
  })

  return NextResponse.json({ ok: true, password })
}

async function deleteStaff(body: { user_id: string }) {
  const supabase = getSupabase()
  const userId = String(body.user_id || '')

  if (!userId) return NextResponse.json({ error: 'user_id wajib' }, { status: 400 })

  // Delete profile first (FK), then auth user
  await supabase.from('profiles').delete().eq('id', userId)
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
