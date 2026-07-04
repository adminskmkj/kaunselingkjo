'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PortalShell } from '@/components/portal-shell'
import { markStudentReachOutRepliesSeen } from '@/lib/use-reach-out-badges'
import { HeartHandshake, Send } from 'lucide-react'

type Msg = {
  id: string
  message: string
  status: ReachOutStatus
  reply_message: string | null
  replied_at: string | null
  created_at: string
}

export default function MuridReachOutPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!profile || profile.role !== 'student') {
      router.push('/dashboard')
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile])

  async function load() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('reach_out_messages')
        .select('id, message, status, reply_message, replied_at, created_at')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      setMessages(
        (data || []).map((m: Msg) => ({
          ...m,
          status: m.status as ReachOutStatus,
        }))
      )
      if (profile?.id) {
        await markStudentReachOutRepliesSeen(profile.id)
        window.dispatchEvent(new Event('reach-out-badge-refresh'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !text.trim()) return
    setSending(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('reach_out_messages').insert({
        student_id: profile.id,
        sender_id: profile.id,
        message: text.trim(),
        source: 'murid',
        status: 'baru',
      })
      if (error) throw error
      setText('')
      await load()
    } catch (err) {
      console.error(err)
      alert('Gagal hantar. Pastikan GBK dah apply migration Reach Out (012).')
    } finally {
      setSending(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalShell title="Reach Out">
        <div className="flex justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      title="Reach Out"
      subtitle="Hantar mesej kepada Guru Bimbingan & Kaunseling. Balasan akan dipaparkan di sini."
    >
      <div className="mb-6">
        <Link href="/murid" className="text-sm font-semibold text-primary-600 hover:underline">
          ← Kembali ke Portal Murid
        </Link>
      </div>

      <form onSubmit={submit} className="card mb-8">
        <div className="mb-4 flex items-center gap-2">
          <HeartHandshake className="text-rose-500" size={22} />
          <h2 className="text-lg font-black text-slate-900">Tulis Mesej</h2>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input min-h-[140px]"
          placeholder="Contoh: Saya rasa tertekan dengan peperiksaan. Boleh jumpa GBK?"
          required
          maxLength={2000}
        />
        <button type="submit" disabled={sending} className="btn-primary mt-4 inline-flex items-center gap-2">
          <Send size={16} /> {sending ? 'Menghantar...' : 'Hantar kepada GBK'}
        </button>
        <p className="mt-2 text-xs text-slate-500">Mesej sulit — hanya GBK yang boleh baca.</p>
      </form>

      <section className="card">
        <h2 className="mb-4 text-lg font-black text-slate-900">Sejarah Mesej</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada mesej.</p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString('ms-MY')}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${reachOutStatusClass(m.status)}`}>
                    {REACH_OUT_STATUS_LABELS[m.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{m.message}</p>
                {m.reply_message && (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-emerald-100">
                    <p className="text-xs font-bold text-emerald-700">Balasan GBK</p>
                    <p className="mt-1 whitespace-pre-wrap">{m.reply_message}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  )
}