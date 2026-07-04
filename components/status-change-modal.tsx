'use client'

import { useEffect, useState } from 'react'
import { ModalOverlay } from '@/components/modal-overlay'
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_ORDER,
  CaseStatus,
  caseStatusBadgeClass,
} from '@/lib/case-status'
import {
  requiredFieldsForStatus,
  statusChangeHints,
  validateStatusChange,
  type StatusChangeFieldErrors,
} from '@/lib/case-status-change'

type Props = {
  open: boolean
  onClose: () => void
  studentName: string
  fromStatus: CaseStatus
  initialToStatus: CaseStatus
  saving: boolean
  onConfirm: (payload: {
    toStatus: CaseStatus
    nota: string
    tarikhSusulan: string
    agensiRujukan: string
  }) => void
}

export function StatusChangeModal({
  open,
  onClose,
  studentName,
  fromStatus,
  initialToStatus,
  saving,
  onConfirm,
}: Props) {
  const [toStatus, setToStatus] = useState<CaseStatus>(initialToStatus)
  const [nota, setNota] = useState('')
  const [tarikhSusulan, setTarikhSusulan] = useState('')
  const [agensiRujukan, setAgensiRujukan] = useState('')
  const [errors, setErrors] = useState<StatusChangeFieldErrors>({})

  useEffect(() => {
    if (!open) return
    setToStatus(initialToStatus)
    setNota('')
    setTarikhSusulan('')
    setAgensiRujukan('')
    setErrors({})
  }, [open, initialToStatus])

  const required = requiredFieldsForStatus(toStatus)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateStatusChange(toStatus, { nota, tarikhSusulan, agensiRujukan })
    if (!v.ok) {
      setErrors(v.errors)
      return
    }
    setErrors({})
    onConfirm({ toStatus, nota, tarikhSusulan, agensiRujukan })
  }

  const showNota = required.includes('nota') || toStatus === 'susulan' || toStatus === 'selesai'
  const showTarikh = required.includes('tarikhSusulan')
  const showAgensi = required.includes('agensiRujukan')

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      title="Kemas kini status kes"
      subtitle={`${studentName} · semasa: ${CASE_STATUS_LABELS[fromStatus]}`}
      size="md"
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
            Batal
          </button>
          <button type="submit" form="status-change-form" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan status'}
          </button>
        </div>
      }
    >
      <form id="status-change-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status baharu</label>
          <select
            value={toStatus}
            onChange={(e) => setToStatus(e.target.value as CaseStatus)}
            className={`input w-full rounded-xl border px-3 py-2 text-sm font-bold ${caseStatusBadgeClass(toStatus)}`}
          >
            {CASE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">{statusChangeHints(toStatus)}</p>
        </div>

        {showTarikh && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {toStatus === 'rujuk_luar' ? 'Tarikh rujuk' : 'Tarikh susulan / sesi seterusnya'}
            </label>
            <input
              type="date"
              className="input w-full"
              value={tarikhSusulan}
              onChange={(e) => setTarikhSusulan(e.target.value)}
            />
            {errors.tarikhSusulan && <p className="mt-1 text-xs text-rose-600">{errors.tarikhSusulan}</p>}
          </div>
        )}

        {showAgensi && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Agensi / pihak rujukan</label>
            <input
              className="input w-full"
              value={agensiRujukan}
              onChange={(e) => setAgensiRujukan(e.target.value)}
              placeholder="Contoh: PKD, JKM, pakar psikiatri"
            />
            {errors.agensiRujukan && <p className="mt-1 text-xs text-rose-600">{errors.agensiRujukan}</p>}
          </div>
        )}

        {showNota && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {toStatus === 'selesai' ? 'Ringkasan penutup' : 'Nota susulan'}
            </label>
            <textarea
              className="input min-h-[100px] w-full"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={toStatus === 'selesai' ? 'Min 20 aksara…' : 'Apa yang dilakukan / diperhatikan…'}
            />
            {errors.nota && <p className="mt-1 text-xs text-rose-600">{errors.nota}</p>}
          </div>
        )}

        {toStatus === 'baru' && fromStatus !== 'baru' && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Menetapkan semula ke Baru — gunakan hanya jika kes perlu dibuka semula.
          </p>
        )}
      </form>
    </ModalOverlay>
  )
}