'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type EmotionType = 'gembira' | 'biasa' | 'sedih' | 'tertekan'
type NeedHelp = 'ya' | 'mungkin' | 'tidak'

export default function RefleksiPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [q1, setQ1] = useState<number>(3)
  const [q2, setQ2] = useState<number>(3)
  const [q3, setQ3] = useState<number>(3)
  const [q4, setQ4] = useState<number>(3)
  const [q5, setQ5] = useState<number>(3)
  const [q6, setQ6] = useState<number>(3)
  const [q7, setQ7] = useState<EmotionType>('biasa')
  const [q8, setQ8] = useState<number>(3)
  const [q9, setQ9] = useState<number>(3)
  const [q10, setQ10] = useState<NeedHelp>('tidak')

  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== 'student') {
        router.push('/dashboard')
      }
    }
  }, [profile, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('checkins')
        .insert({
          student_id: profile!.id,
          checkin_date: new Date().toISOString().split('T')[0],
          q1_kehadiran_ketepatan: q1,
          q2_pematuhan_peraturan: q2,
          q3_penyiapan_tugasan: q3,
          q4_kebersihan: q4,
          q5_komunikasi_sopan: q5,
          q6_motivasi_belajar: q6,
          q7_perasaan_emosi: q7,
          q8_hubungan_rakan: q8,
          q9_tahap_stres: q9,
          q10_perlukan_bantuan: q10,
        })

      if (error) throw error

      setSubmitted(true)
      setTimeout(() => {
        router.push('/murid')
      }, 2000)
    } catch (error) {
      console.error('Error submitting checkin:', error)
      alert('Gagal menyimpan refleksi. Sila cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h2>
          <p className="text-gray-600">Refleksi anda telah disimpan.</p>
        </div>
      </div>
    )
  }

  const RatingScale = ({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: [string, string, string] }) => (
    <div className="flex gap-4 justify-center">
      {[1, 2, 3].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            value === v
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="text-3xl mb-2">
            {v === 1 ? '😔' : v === 2 ? '😐' : '😊'}
          </div>
          <p className="text-sm font-medium">{labels[v - 1]}</p>
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Refleksi Harian</h1>
            <p className="text-gray-600">Luangkan 2-3 minit untuk menilai hari anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bahagian A: Disiplin */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">
                Bahagian A: Disiplin & Tanggungjawab
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    1. Kehadiran & ketepatan masa
                  </label>
                  <RatingScale value={q1} onChange={setQ1} labels={['Lewat', 'Tepat kadang-kadang', 'Sentiasa tepat']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    2. Pematuhan peraturan sekolah
                  </label>
                  <RatingScale value={q2} onChange={setQ2} labels={['Kurang patuh', 'Sederhana', 'Sangat patuh']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    3. Penyiapan tugasan
                  </label>
                  <RatingScale value={q3} onChange={setQ3} labels={['Tidak siap', 'Kadang-kadang', 'Sentiasa siap']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    4. Kebersihan diri & persekitaran
                  </label>
                  <RatingScale value={q4} onChange={setQ4} labels={['Kurang', 'Sederhana', 'Cemerlang']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    5. Komunikasi sopan dengan guru & rakan
                  </label>
                  <RatingScale value={q5} onChange={setQ5} labels={['Kurang sopan', 'Sederhana', 'Sangat sopan']} />
                </div>
              </div>
            </div>

            {/* Bahagian B: Emosi */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">
                Bahagian B: Emosi & Kesejahteraan
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    6. Tahap motivasi belajar hari ini
                  </label>
                  <RatingScale value={q6} onChange={setQ6} labels={['Rendah', 'Sederhana', 'Tinggi']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    7. Perasaan emosi saya hari ini
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['gembira', 'biasa', 'sedih', 'tertekan'] as EmotionType[]).map((emotion) => (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => setQ7(emotion)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          q7 === emotion
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-3xl mb-2">
                          {emotion === 'gembira' ? '😄' : emotion === 'biasa' ? '😐' : emotion === 'sedih' ? '😢' : '😰'}
                        </div>
                        <p className="text-sm font-medium capitalize">{emotion}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    8. Hubungan dengan rakan sebaya
                  </label>
                  <RatingScale value={q8} onChange={setQ8} labels={['Konflik', 'Neutral', 'Harmoni']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    9. Tahap stres / tekanan
                  </label>
                  <RatingScale value={q9} onChange={setQ9} labels={['Tinggi', 'Sederhana', 'Rendah']} />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">
                    10. Adakah saya perlukan bantuan?
                  </label>
                  <div className="flex gap-4">
                    {(['ya', 'mungkin', 'tidak'] as NeedHelp[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setQ10(option)}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                          q10 === option
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-3xl mb-2">
                          {option === 'ya' ? '🆘' : option === 'mungkin' ? '🤔' : '👍'}
                        </div>
                        <p className="text-sm font-medium capitalize">{option}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
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
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
