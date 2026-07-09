import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const groqKey = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

// ponytail: no AI SDK dep — Groq is OpenAI-compatible, plain fetch suffices.
// Add persistence (ai_analyses table) when cross-session caching is wanted.
export async function POST(req: NextRequest) {
  try {
    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key tidak dikonfigurasi (GROQ_API_KEY)' }, { status: 503 })
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase tidak dikonfigurasi' }, { status: 500 })
    }

    // Verify caller session + role (counselor/admin only)
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sb = createClient(supabaseUrl, supabaseServiceKey)
    const { data: userData, error: userErr } = await sb.auth.getUser(token)
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await sb
      .from('profiles')
      .select('role, full_name')
      .eq('id', userData.user.id)
      .single()
    if (!profile || (profile.role !== 'counselor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { student_id } = await req.json()
    if (!student_id) return NextResponse.json({ error: 'student_id wajib' }, { status: 400 })

    // Student profile
    const { data: sp } = await sb
      .from('profiles')
      .select('full_name, class_name')
      .eq('id', student_id)
      .single()

    // Active risk
    const { data: risk } = await sb
      .from('risk_levels')
      .select('level, reason, calculated_at')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single()

    // Recent checkins (14d)
    const since = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
    const { data: checks } = await sb
      .from('checkins')
      .select('checkin_date, emotional_score, q7_perasaan_emosi, q9_tahap_stres, q10_perlukan_bantuan')
      .gte('checkin_date', since)
      .eq('student_id', student_id)
      .order('checkin_date', { ascending: false })

    // Past interventions (context)
    const { data: cases } = await sb
      .from('intervention_records')
      .select('intervention_type, summary, case_status, session_date')
      .eq('student_id', student_id)
      .order('session_date', { ascending: false })
      .limit(5)

    const prompt = buildPrompt(sp, risk, checks, cases)

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Anda seorang kaunselor sekolah di Malaysia. Jawab dalam Bahasa Melayu yang mesra, profesional dan sensitif budaya. Gunakan format markdown ringkas dengan subtajuk. Jangan mereka-reka fakta di luar data yang diberi.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    })

    if (!groqRes.ok) {
      const t = await groqRes.text()
      return NextResponse.json(
        { error: `Groq gagal (${groqRes.status})`, detail: t.slice(0, 300) },
        { status: 502 }
      )
    }

    const j = await groqRes.json()
    const analysis = j.choices?.[0]?.message?.content || ''
    return NextResponse.json({ analysis })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

function buildPrompt(
  sp: { full_name: string | null; class_name: string | null } | null,
  risk: { level: string; reason: string; calculated_at: string } | null,
  checks: Array<{
    checkin_date: string
    emotional_score: number | null
    q7_perasaan_emosi: string | null
    q9_tahap_stres: number | null
    q10_perlukan_bantuan: string | null
  }> | null,
  cases: Array<{
    intervention_type: string | null
    summary: string | null
    case_status: string | null
    session_date: string | null
  }> | null
): string {
  const name = sp?.full_name || 'Murid'
  const cls = sp?.class_name || 'tidak ditetapkan'
  const riskLine = risk
    ? `- Tahap risiko: ${risk.level.toUpperCase()} (${risk.reason}) sejak ${risk.calculated_at.slice(0, 10)}`
    : '- Tahap risiko: tiada rekod aktif'

  const checkLines =
    checks && checks.length
      ? checks
          .map(
            (c) =>
              `  • ${c.checkin_date} — skor emosi ${c.emotional_score ?? '?'}, perasaan: ${
                c.q7_perasaan_emosi ?? '-'
              }, stres: ${c.q9_tahap_stres ?? '-'}, perlu bantuan: ${c.q10_perlukan_bantuan ?? '-'}`
          )
          .join('\n')
      : '  • Tiada check-in 14 hari lalu'

  const caseLines =
    cases && cases.length
      ? cases
          .map((c) => `  • ${c.session_date} [${c.case_status}] ${c.intervention_type}: ${c.summary || '-'}`)
          .join('\n')
      : '  • Tiada rekod intervensi lepas'

  return `Sila analisis profil murid berikut untuk bantuan kaunselor.

**Maklumat Murid**
- Nama: ${name}
- Kelas: ${cls}
${riskLine}

**Check-in terkini (14 hari)**
${checkLines}

**Sejarah Intervensi**
${caseLines}

Sila berikan:
1. **Ringkasan keadaan** murid berdasarkan data.
2. **Kemungkinan punca** (sensitif budaya, jangan spekulasi melulu).
3. **Cadangan intervensi** (2-3 tindakan konkrit, sesuai konteks sekolah Malaysia).
4. **Satu ayat mesra untuk ibu bapa** (jika perlu kongsi).`
}
