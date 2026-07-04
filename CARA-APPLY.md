# CARA APPLY — Migration 010 (Skor Disiplin vs Emosi)

## Apa yang dibetulkan

- **Sebelum:** `total_score` campur Bahagian A (disiplin) + B (emosi) → murid disiplin tinggi + tertekan boleh dapat **hijau**.
- **Selepas:** `discipline_score` dan `emotional_score` berasingan; **risk GBK** ikut **emosi** + q7/q9/q10.

## Langkah (Supabase Dashboard)

1. Buka projek Supabase STAR-KJo → **SQL Editor** → **New query**.
2. Salin **keseluruhan** fail (pilih satu):
   - **`supabase/migrations/010_apply_safe.sql`** ← **disyorkan** (duplicate risk / lajur belum wujud / separuh gagal)
   - atau `010_separate_checkin_scores.sql` (fresh install sahaja)
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

## Jika error duplicate risk ATAU `emotional_score does not exist`

Jalankan **satu fail**:

**`supabase/migrations/010_apply_safe.sql`**

(Jangan guna `010_fix_risk_backfill.sql` — tiada ADD COLUMN.)

Kemudian semak:

```sql
SELECT level, COUNT(*) FROM risk_levels WHERE is_active = true GROUP BY level;
```

- Case Management UI (status kes)
- Reach Out inbox

## Migration 012 (Reach Out)

1. SQL Editor → paste **`supabase/migrations/012_reach_out_inbox.sql`** → Run
2. Semak: `SELECT COUNT(*) FROM reach_out_messages;`

## Migration 013 (badge Reach Out)

1. SQL Editor → **`supabase/migrations/013_reach_out_unread_badges.sql`** → Run
2. GBK: badge merah = mesej status **Baru**; murid: badge = balasan GBK belum dibaca

## Migration 014 (catatan GBK untuk ibu bapa)

1. SQL Editor → **`supabase/migrations/014_parent_intervention_visibility.sql`** → Run
2. GBK: semasa **Intervensi**, tick **Kongsi ringkasan dengan ibu bapa** + isi mesej selamat

## Migration 015 (ibu bapa paut anak dengan IC)

1. SQL Editor → **`supabase/migrations/015_parent_link_child_by_ic.sql`** → Run
2. Ibu bapa: daftar akaun sendiri di `/daftar-akaun` → login → `/ibu-bapa` → boleh paut lebih daripada seorang anak guna **No. IC murid 12 digit**