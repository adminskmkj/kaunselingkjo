'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type SupabaseCheckinClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: Error | null }>
        }
      }
    }
    insert: (payload: Record<string, unknown>) => Promise<{ error: Error | null }>
  }
}

const SCALE_LABELS = ['Sangat Tidak Setuju', 'Tidak Setuju', 'Neutral', 'Setuju', 'Sangat Setuju']
const SCALE_EMOJI = ['😞', '🙁', '😐', '🙂', '😄']

type Question = {
  key: string
  text: string
}

const DISIPLIN_QUESTIONS: Question[] = [
  { key: 'q1_kehadiran_ketepatan', text: 'Saya hadir ke sekolah tepat pada waktunya hari ini.' },
  { key: 'q2_pematuhan_peraturan', text: 'Saya memakai pakaian seragam mengikut peraturan sekolah.' },
  { key: 'q3_penyiapan_tugasan', text: 'Saya menghormati guru sepanjang hari ini.' },
  { key: 'q4_kebersihan', text: 'Saya bercakap dengan sopan kepada rakan-rakan.' },
  { key: 'q5_komunikasi_sopan', text: 'Saya mendengar arahan guru dan melaksanakannya.' },
  { key: 'q6_motivasi_belajar', text: 'Saya menyiapkan tugasan yang diberikan.' },
  { key: 'q8_hubungan_rakan', text: 'Saya menjaga kebersihan kelas dan kawasan sekolah.' },
  { key: 'q9_tahap_stres', text: 'Saya tidak bergaduh, mengejek atau membuli rakan.' },
  { key: 'q10_perlukan_bantuan', text: 'Saya menjaga harta benda sekolah dengan baik.' },
  { key: 'q7_perasaan_emosi', text: 'Saya bertanggungjawab terhadap kesalahan saya jika saya melakukan kesilapan.' },
]

const EMOSI_A: Question[] = [
  { key: 'q11_emosi_gembira', text: 'Saya berasa gembira hari ini.' },
  { key: 'q12_emosi_tenang', text: 'Saya berasa tenang ketika berada di sekolah.' },
  { key: 'q13_emosi_sedar', text: 'Saya tahu perasaan yang saya alami hari ini.' },
  { key: 'q14_emosi_kawal', text: 'Saya dapat mengawal emosi apabila menghadapi masalah.' },
  { key: 'q15_emosi_senyum', text: 'Saya masih mampu tersenyum walaupun menghadapi cabaran hari ini.' },
]

const EMOSI_B: Question[] = [
  { key: 'q16_sosial_diterima', text: 'Saya berasa diterima oleh rakan-rakan.' },
  { key: 'q17_sosial_sokongan', text: 'Saya mempunyai seseorang untuk bercakap apabila saya sedih atau risau.' },
  { key: 'q18_sosial_layanan', text: 'Saya melayan rakan dengan baik hari ini.' },
]

const EMOSI_C: Question[] = [
  { key: 'q19_tekanan_risu', text: 'Saya berasa risau atau tertekan hari ini.' },
  { key: 'q20_tekanan_takut', text: 'Saya berasa takut untuk datang ke sekolah hari ini.' },
  { key: 'q21_tekanan_marah', text: 'Saya mudah marah hari ini.' },
  { key: 'q22_tekanan_yakin', text: 'Saya berasa yakin dengan diri saya hari ini.' },
]

export default function RefleksiPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const allQuestions = [...DISIPLIN_QUESTIONS, ...EMOSI_A, ...EMOSI_B, ...EMOSI_C]
  const [answers, setAnswers] = useState<Record<string, number | null>>({})

  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== 'student') {
        router.push('/dashboard')
      }
    }
  }, [profile, authLoading, router])

  const allAnswered = allQuestions.every((q) => answers[q.key] !== null && answers[q.key] !== undefined)

  function setAnswer(key: string, value: number) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!allAnswered) {
      setFormError('Sila jawab semua soalan sebelum hantar.')
      return
    }

    if (!profile) {
      setFormError('Sesi tidak sah. Sila login semula.')
      return
    }

    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const client = supabase as unknown as SupabaseCheckinClient
      const { data: existing, error: existingError } = await client
        .from('checkins')
        .select('id')
        .eq('student_id', profile.id)
        .eq('checkin_date', today)
        .maybeSingle()

      if (existingError) throw existingError
      if (existing) {
        setFormError('Anda sudah mengisi refleksi hari ini. Sila kembali esok.')
        return
      }

      // ponytail: q7/q10 legacy kini INTEGER (skala 1-5), bukan enum lagi
      const payload: Record<string, unknown> = {
        student_id: profile.id,
        checkin_date: today,
      }
      allQuestions.forEach((q) => {
        payload[q.key] = answers[q.key]
      })

      const { error } = await client.from('checkins').insert(payload)

      if (error) throw error

      setSubmitted(true)
      setTimeout(() => {
        router.push('/murid')
      }, 2000)
    } catch (error) {
      console.error('Error submitting checkin:', error)
      setFormError(error instanceof Error ? error.message : 'Gagal menyimpan refleksi. Sila cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h2>
          <p className="text-gray-600">Refleksi anda telah disimpan.</p>
        </div>
      </div>
    )
  }

  const RatingScale = ({
    questionKey,
  }: {
    questionKey: string
  }) => {
    const value = answers[questionKey] ?? null
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAnswer(questionKey, v)}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              value === v
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}
          >
            <div className="text-2xl mb-1">{SCALE_EMOJI[v - 1]}</div>
            <p className="text-[10px] font-medium leading-tight">{SCALE_LABELS[v - 1]}</p>
          </button>
        ))}
      </div>
    )
  }

  const QuestionBlock = ({ q, num }: { q: Question; num: number }) => (
    <div>
      <label className="block text-gray-700 font-medium mb-3 text-sm">
        {num}. {q.text}
      </label>
      <RatingScale questionKey={q.key} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Refleksi Harian</h1>
            <p className="text-gray-600">Luangkan 2-3 minit untuk menilai hari anda</p>
            <p className="mt-2 text-sm text-slate-500">Skala 1-5: 1=Sangat Tidak Setuju, 5=Sangat Setuju</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bahagian A: Disiplin */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">
                Bahagian A: Refleksi Disiplin
              </h2>
              <div className="space-y-6">
                {DISIPLIN_QUESTIONS.map((q, i) => (
                  <QuestionBlock key={q.key} q={q} num={i + 1} />
                ))}
              </div>
            </div>

            {/* Bahagian B: Emosi - Kesedaran Emosi */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">
                Bahagian B: Refleksi Emosi
              </h2>
              <h3 className="text-sm font-bold text-indigo-700 mb-4">B1. Kesedaran Emosi</h3>
              <div className="space-y-6">
                {EMOSI_A.map((q, i) => (
                  <QuestionBlock key={q.key} q={q} num={i + 1} />
                ))}
              </div>
            </div>

            {/* B2: Hubungan Sosial */}
            <div>
              <h3 className="text-sm font-bold text-indigo-700 mb-4">B2. Hubungan Sosial</h3>
              <div className="space-y-6">
                {EMOSI_B.map((q, i) => (
                  <QuestionBlock key={q.key} q={q} num={i + 1} />
                ))}
              </div>
            </div>

            {/* B3: Tekanan & Kebimbangan */}
            <div>
              <h3 className="text-sm font-bold text-indigo-700 mb-2">B3. Tekanan & Kebimbangan</h3>
              <p className="mb-4 text-xs text-slate-500 italic">
                Untuk soalan ini, jawab ikut perasaan sebenar. (Skor akan di-reverse: semakin tinggi skor akhir = semakin sihat emosi)
              </p>
              <div className="space-y-6">
                {EMOSI_C.map((q, i) => (
                  <QuestionBlock key={q.key} q={q} num={i + 1} />
                ))}
              </div>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div>
            )}

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.push('/murid')}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !allAnswered}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Menyimpan...' : 'Hantar Refleksi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
