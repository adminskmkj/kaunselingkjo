import { CASE_STATUS_LABELS, type CaseStatus } from './case-status'

export type InterventionPrintData = {
  id: string
  student_name: string
  class_name: string | null
  session_date: string
  intervention_type: string | null
  objective: string | null
  summary: string | null
  follow_up_action: string | null
  case_status: CaseStatus
  tarikh_susulan: string | null
  referral_to: string | null
  counselor_name?: string
}

export function openInterventionPrint(data: InterventionPrintData) {
  const esc = (s: string | null | undefined) =>
    (s ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Rekod Intervensi — ${esc(data.student_name)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;color:#111;padding:0 16px}
  h1{font-size:18px;margin:0 0 4px}
  .meta{color:#555;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{text-align:left;width:32%;padding:8px 0;border-bottom:1px solid #e5e5e5;color:#444;font-weight:600;vertical-align:top}
  td{padding:8px 0;border-bottom:1px solid #e5e5e5}
  .block{margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:14px;line-height:1.5}
  @media print{body{margin:0}}
</style></head><body>
<h1>S.T.A.R KJo — Rekod Intervensi GBK</h1>
<p class="meta">SK Mohd Khir Johari · Dicetak ${new Date().toLocaleString('ms-MY')}</p>
<table>
<tr><th>Murid</th><td>${esc(data.student_name)}</td></tr>
<tr><th>Kelas</th><td>${esc(data.class_name)}</td></tr>
<tr><th>Tarikh sesi</th><td>${esc(data.session_date)}</td></tr>
<tr><th>Jenis</th><td>${esc(data.intervention_type)}</td></tr>
<tr><th>Status kes</th><td>${esc(CASE_STATUS_LABELS[data.case_status])}</td></tr>
<tr><th>Tarikh susulan</th><td>${esc(data.tarikh_susulan)}</td></tr>
<tr><th>Rujukan</th><td>${esc(data.referral_to)}</td></tr>
<tr><th>GBK</th><td>${esc(data.counselor_name)}</td></tr>
</table>
<div class="block"><strong>Objektif</strong><br/>${esc(data.objective)}</div>
<div class="block"><strong>Ringkasan sesi</strong><br/>${esc(data.summary)}</div>
<div class="block"><strong>Tindakan susulan</strong><br/>${esc(data.follow_up_action)}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`

  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) {
    alert('Pop-up disekat. Benarkan pop-up untuk cetak.')
    return
  }
  w.document.write(html)
  w.document.close()
}