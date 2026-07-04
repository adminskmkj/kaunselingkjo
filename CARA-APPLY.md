# CARA APPLY — Migration 010 (Skor Disiplin vs Emosi)

## Apa yang dibetulkan

- **Sebelum:** `total_score` campur Bahagian A (disiplin) + B (emosi) → murid disiplin tinggi + tertekan boleh dapat **hijau**.
- **Selepas:** `discipline_score` dan `emotional_score` berasingan; **risk GBK** ikut **emosi** + q7/q9/q10.

## Langkah (Supabase Dashboard)

1. Buka projek Supabase STAR-KJo → **SQL Editor** → **New query**.
2. Salin **keseluruhan** fail:
   `supabase/migrations/010_separate_checkin_scores.sql`
3. Klik **Run** (satu shot). Tunggu selesai tanpa error.
4. Semak cepat:

```sql
SELECT discipline_score, emotional_score, total_score, q7_perasaan_emosi
FROM checkins
ORDER BY created_at DESC
LIMIT 5;
```

```sql
SELECT level, COUNT(*) FROM risk_levels WHERE is_active = true GROUP BY level;
```

## Deploy frontend (Vercel)

Selepas SQL OK, pastikan kod terkini di `main` (GBK/murid/ibu-bapa guna lajur baru):

```bash
git pull
npm run build
git push origin main
```

Hard refresh: `https://kaunselingkjo.vercel.app`

## Nota

- Migration **010** tidak ganti 001/008 — ia **override** function & trigger yang sama.
- `total_score` masih wujud (purata disiplin+emosi) untuk rujukan lama; **jangan** guna untuk risk.
- Jika error “column already exists”, lajur mungkin dah apply — skip `ADD COLUMN` atau hubungi dev.

## Susulan (belum dalam migration ini)

- Case Management UI (status kes)
- Reach Out inbox