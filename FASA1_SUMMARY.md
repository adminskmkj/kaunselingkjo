# S.T.A.R KJo - Fasa 1 Setup Summary

## ✅ Apa Yang Dah Siap

### 1. Project Structure
```
D:/apps/star-kjo/
├── app/
│   ├── page.tsx              # Landing page (role navigation)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind CSS
├── lib/
│   └── supabase.ts           # Supabase client config
├── types/
│   └── database.types.ts     # TypeScript types (placeholder)
├── supabase/migrations/
│   ├── 001_initial_schema.sql    # 13 jadual + triggers
│   ├── 002_rls_policies.sql      # Row Level Security
│   └── 003_seed_data.sql         # 10 default badges
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .gitignore
├── .env.local.example
└── README.md                 # Setup instructions
```

### 2. Database Schema (13 Jadual)

1. **profiles** — semua pengguna (murid/guru/GBK/ibu bapa/pentadbir)
   - Role-based (enum)
   - IC/Student ID untuk murid (6 digit)
   - Parent link (parent_id)
   - must_change_password flag

2. **checkins** — refleksi harian murid
   - 10 soalan (5 disiplin + 5 emosi/kesejahteraan)
   - Auto-calculate total_score (0-100%)
   - Unique constraint: 1 checkin per student per day

3. **weekly_scores** — agregat mingguan
   - Untuk dashboard analytics
   - Status: cemerlang/baik/sederhana/perlu_bimbingan

4. **risk_levels** — sistem amaran awal
   - hijau / kuning / jingga / merah
   - Auto-calculated based on trends
   - Only 1 active risk level per student

5. **behavior_records** — pelbagai sumber data
   - attendance / discipline_case / merit / cocurricular / teacher_note / self_reflection
   - Points (+/-)
   - recorded_by (guru yang key in)

6. **intervention_records** — GBK case management
   - Session notes
   - Objective, summary, follow-up
   - case_status: baru → dalam_tindakan → selesai / rujuk_luar
   - referral_to field

7. **counseling_sessions** — tempahan sesi
   - Student request
   - GBK approve/manage
   - reminder_sent flag

8. **badges** / **student_badges** — gamifikasi
   - 10 default badges (Pemula, Konsisten 7 Hari, Cemerlang, dll.)
   - Many-to-many relationship

9. **points_tracker** — streak & points
   - current_streak, longest_streak
   - Auto-update via trigger bila checkin

10. **notifications** — peringatan auto
    - reminder_checkin, alert_no_checkin, motivational_message, etc.

11. **audit_logs** — security
    - Track siapa akses data apa
    - IP address, timestamp

12. **ai_recommendations** — Fasa 5
    - AI-generated intervention suggestions
    - Priority ranking

### 3. Security (RLS Policies)

✅ **Students**:
- View/insert own checkins sahaja
- View own scores, badges, points
- Cannot view intervention records (confidential)

✅ **Guru Kelas**:
- View students dalam kelas sahaja
- Add behavior_records (catatan, merit, kes disiplin)
- View risk levels (read-only)

✅ **GBK (Counselor)**:
- Full access ke semua data
- Manage intervention_records
- Manage risk_levels
- View audit logs

✅ **Ibu Bapa**:
- View anak punya data sahaja (linked via parent_id)
- **CANNOT** view teacher_note (internal)
- **CANNOT** view intervention_records (confidential)

✅ **Pentadbir (Admin)**:
- Full system access
- User management
- View audit logs

### 4. Auto-Calculations (Triggers)

✅ **checkins_calculate_score**:
- Auto-calculate total_score bila murid submit refleksi
- Formula: (bahagian_a + bahagian_b + q7 + q10) / 30 * 100
- Bahagian A (disiplin): 5 soalan x 3 = 15 max
- Bahagian B (emosi): 3 soalan x 3 + q7 (3) + q10 (3) = 15 max

✅ **checkins_update_streak**:
- Auto-update points_tracker bila checkin baru
- Kira streak harian (consecutive days)
- Update longest_streak jika pecah rekod

### 5. Landing Page

Simple role navigation:
- **Murid** → /murid
- **GBK** → /gbk
- **Guru** → /guru
- **Ibu Bapa** → /ibu-bapa

(Routes belum dibuat, Fasa 2 nanti)

### 6. Dev Server Running

✅ http://localhost:3000 (Turbopack)  
✅ Git repo initialized  
✅ First commit: `feat: Fasa 1 - Initial setup`

---

## 📋 Next Steps (Fasa 2)

### Setup Supabase Project (Awak kena buat manually)

1. **Buat project baru**: https://supabase.com
2. **Copy credentials**:
   - Project URL
   - anon public key
   - service_role key
3. **Isi `.env.local`** (copy dari `.env.local.example`)
4. **Run migrations** di Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`
5. **Generate types** (optional):
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
   ```

### Build Fasa 2 (Core Features)

1. **Auth pages**:
   - `/login` — universal login (detect role by IC/email format)
   - `/signup` — murid self-signup (optional, atau bulk provision?)
   - `/reset-password`

2. **Murid portal** (`/murid`):
   - Dashboard (skor, streak, badges)
   - Refleksi form (10 soalan, emoji/slider UI)
   - Tempah sesi kaunseling
   - History refleksi

3. **GBK dashboard** (`/gbk`):
   - Overview stats (total murid, by risk level)
   - Risk levels table (murid hijau/kuning/jingga/merah)
   - Intervention records (case management)
   - Counseling sessions calendar

4. **Guru portal** (`/guru`):
   - Murid dalam kelas (list + search)
   - Tambah catatan/merit/kes disiplin
   - View behavior trends

5. **Ibu bapa portal** (`/ibu-bapa`):
   - View anak progress (read-only)
   - Ringkasan skor mingguan
   - Upcoming counseling sessions

---

## 🎯 Objektif Dicapai (Fasa 1)

✅ Struktur database kukuh — multi-role, early warning, gamifikasi, audit trail  
✅ Security RLS — setiap role nampak data yang sepatutnya sahaja  
✅ Auto-calculations — triggers handle scoring & streaks  
✅ Scalable architecture — Next.js App Router + Supabase Realtime ready  
✅ Ready untuk Fasa 2 (frontend implementation)

---

## 📌 Catatan Penting

### Login Format (confirm dengan awak)

**Murid**:
- Username: **6 digit akhir IC** (contoh: `010345` dari IC `030512-01-0345`)
- Password default: `skmkj@1010.murid1234`
- First login: kena tukar password (must_change_password=true)

**Guru/GBK/Pentadbir**:
- Email sekolah (contoh: `gbk@smkkj.edu.my`, `guru.disiplin@smkkj.edu.my`)
- Password: manual set by admin

**Ibu Bapa**:
- Email peribadi (contoh: `ali.abu@gmail.com`)
- Password: auto-generate via invite link (Fasa 2)
- Link ke anak via `parent_id` dalam profiles table

### Refleksi Murid (10 Soalan)

**Bahagian A: Disiplin & Tanggungjawab** (skala 1-3):
1. Kehadiran & ketepatan masa
2. Pematuhan peraturan sekolah
3. Penyiapan tugasan
4. Kebersihan diri & persekitaran
5. Komunikasi sopan dengan guru & rakan

**Bahagian B: Emosi & Kesejahteraan**:
6. Tahap motivasi belajar (1-3)
7. Perasaan emosi (gembira/biasa/sedih/tertekan)
8. Hubungan dengan rakan (1=konflik, 2=neutral, 3=harmoni)
9. Tahap stres (1=tinggi, 2=sederhana, 3=rendah)
10. Adakah saya perlukan bantuan? (ya/mungkin/tidak)

### Behavior Records — Siapa Key In

- **Murid**: refleksi harian (auto via checkins, bukan direct insert ke behavior_records)
- **Guru Kelas**: catatan (teacher_note), merit, kes disiplin
- **Guru Disiplin**: kes disiplin major
- **GBK**: semua jenis (kalau perlu manual override)

### Sistem Kehadiran KJo Integration (Fasa 2/3)

Setup API endpoint `/api/attendance/import` untuk terima POST dari APDM:

```json
{
  "student_id": "010345",
  "date": "2026-07-01",
  "status": "hadir" | "lewat" | "tidak_hadir",
  "reason": "sakit" (optional)
}
```

Endpoint akan auto-create behavior_records entry dengan record_type='attendance'.

---

## 🛠️ Commands Reference

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # ESLint check

# Git
git status               # Check changes
git add -A               # Stage all
git commit -m "message"  # Commit
git push                 # Push to remote (setup GitHub repo first)

# Supabase (after project setup)
npx supabase link --project-ref YOUR_REF
npx supabase db push     # Push migrations
npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts
```

---

## 🚀 Deploy ke Vercel (Bila Siap Fasa 2)

1. Push code ke GitHub
2. Import repo di https://vercel.com
3. Add env variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

Auto-deploy setiap kali push ke `main`.

---

**Status**: Fasa 1 ✅ COMPLETE  
**Next**: Fasa 2 — Auth + Portal UIs  
**Location**: `D:/apps/star-kjo`  
**Dev server**: http://localhost:3000 (running)
