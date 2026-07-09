# Runbook Operasi — S.T.A.R KJo

Dokumen ini untuk pentadbir/agent teknikal sekolah. Semua command dijalankan dari root projek `D:/apps/star-kjo`.

## 1. Apply migration Supabase

Migration SQL tidak auto-run dari GitHub/Vercel. Buka Supabase Dashboard → SQL Editor → jalankan ikut nombor fail:

1. `supabase/migrations/007_auto_profile_trigger.sql`
2. `supabase/migrations/008_risk_levels_on_checkin.sql`
3. `supabase/migrations/009_rls_hardening.sql`
4. `supabase/migrations/010_separate_checkin_scores.sql` — **ikut `CARA-APPLY.md`**

Lepas 007, Auth user baharu yang ada `user_metadata.role` akan auto dapat row `profiles`.
Lepas 008, refleksi/checkin baharu akan auto update `risk_levels` aktif untuk dashboard GBK.
Lepas 009, policy RLS lama yang terlalu longgar diketatkan dan direct user-write ke `points_tracker` ditutup.
Lepas 010, skor disiplin/emosi berasingan; risk GBK ikut **emosi** (bukan skor gabungan).

Juga pastikan migration portal guru dijalankan bila perlu:

- `supabase/migrations/026_staff_view_risk_levels.sql` — guru/disiplin boleh **baca** `risk_levels` (read-only) untuk dashboard `/guru`.

## 2. Backfill profile lama

Untuk repair Auth user lama yang tiada row `profiles`:

```bash
node scripts/backfill-profiles.js
```

Untuk paksa murid lama tukar password pada login seterusnya apabila row profile baru dicipta:

```bash
node scripts/backfill-profiles.js --force-student-reset
```

Nota: script ini tidak meneka role staff. Untuk staff, guna `create-staff.js`.

## 3. Create/update staff GBK/guru/admin

Password staff tidak disimpan dalam repo. Set melalui env sebelum run:

```bash
ASHRAF_PASSWORD='kata_laluan_baru' TASHA_PASSWORD='kata_laluan_baru' node scripts/create-staff.js
```

Di Windows PowerShell, set env ikut cara PowerShell sebelum memanggil Node. Jika guna Git Bash, command di atas boleh terus digunakan.

Script akan:
- create/update Supabase Auth user
- set `user_metadata.role`
- upsert row `profiles`

## 3b. Import staff / guru kelas dari CSV

Template: `scripts/templates/staff.csv`

```bash
# Edit CSV (email, nama, role, class_name)
node scripts/import-staff.js scripts/templates/staff.csv
```

- `class_teacher` **wajib** ada `class_name` yang **exact match** kelas murid (contoh `TAHUN SATU · AL-FARABI`)
- Slip password dijana di `tmp/slip-password-staff-import-*.csv`

## 3c. Export slip password (murid + staff)

```bash
# Dry-run dulu
node scripts/export-password-slips.js --all

# Reset password + tulis CSV (awas: password lama diganti)
node scripts/export-password-slips.js --all --confirm
# atau berasingan:
node scripts/export-password-slips.js --murid --confirm
node scripts/export-password-slips.js --staff --confirm
```

Slip: `tmp/slip-password-murid-*.csv` dan `tmp/slip-password-staff-*.csv`  
**Jangan commit** folder `tmp/`.

## 4. Upload murid KPM/JBA1010

Format Excel JBA1010: row 5 ialah header, row 6+ data murid.

```bash
node scripts/upload-murid.js "C:/path/to/JBA1010.xlsx"
```

Sistem akan:
- guna IC penuh 12 digit sebagai identifier
- create Auth email `{IC12}@student.skmkj.edu.my`
- jana password sementara unik `KJo-...`
- set `must_change_password=true`
- keluarkan slip CSV dalam folder `tmp/`

**Jangan commit folder `tmp/`**. Cetak/edar slip secara terkawal, kemudian padam fail digital jika perlu.

## 5. Reset password murid/staff

Gunakan Supabase Auth Admin API / Supabase Dashboard untuk reset password. Jangan update password melalui SQL biasa.

Murid baharu yang login dengan password sementara akan dipaksa ke `/reset-password` sebelum masuk dashboard.

## 6. Semak audit log

Query asas:

```sql
SELECT *
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 100;
```

## 7. Checklist selepas deploy

- [ ] Migration 007 sudah run
- [ ] Migration 008 sudah run
- [ ] Migration 009 sudah run
- [ ] `node scripts/backfill-profiles.js` sudah run
- [ ] Staff GBK boleh login dan ada `profiles.role='counselor'`
- [ ] Murid baharu login → reset password → masuk `/murid`
- [ ] Murid submit refleksi → row `checkins` wujud
- [ ] Trigger 008 create/update row aktif `risk_levels`
- [ ] Dashboard GBK nampak murid dalam senarai risiko
