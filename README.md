# S.T.A.R KJo - Student Tracker Attitude Report

Sistem pemantauan tingkah laku dan intervensi awal murid SK Mohd Khir Johari.

## 🎯 Objektif

- Memantau, merekod, dan menilai perkembangan nilai, tingkah laku, dan pembabitan pelajar
- Mengesan perubahan emosi dan tingkah laku secara berterusan
- Mengenal pasti murid berisiko melalui sistem amaran awal (early warning)
- Mempercepat tindakan intervensi oleh GBK berdasarkan data
- Menyediakan laporan yang mudah dirujuk oleh pihak sekolah dan ibu bapa

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **Hosting**: Vercel (auto-deploy dari GitHub)
- **Charts**: Recharts

## 📁 Struktur Projek

```
star-kjo/
├── app/
│   ├── murid/          # Portal murid (refleksi harian)
│   ├── gbk/            # Dashboard GBK (intervensi & case management)
│   ├── guru/           # Portal guru (catatan & pantau kelas)
│   ├── ibu-bapa/       # Portal ibu bapa (lihat perkembangan anak)
│   ├── pentadbir/      # Dashboard pentadbir (laporan sekolah)
│   └── api/            # API routes (auth, webhooks, exports)
├── components/         # Reusable UI components
├── lib/                # Utilities & Supabase client
├── supabase/
│   └── migrations/     # Database schema & RLS policies
├── scripts/            # Seed scripts & utilities
└── types/              # TypeScript types
```

## 🚀 Setup (Development)

### 1. Clone repo

```bash
git clone https://github.com/YOUR_ORG/star-kjo.git
cd star-kjo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Supabase Project

1. Buat project baru di [supabase.com](https://supabase.com)
2. Copy `.env.local.example` → `.env.local`
3. Isi credentials dari Supabase dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key (secret!)

### 4. Run migrations

Di Supabase dashboard → SQL Editor, run migrations mengikut urutan:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_seed_data.sql`

**Atau** guna Supabase CLI (recommended):

```bash
# Install Supabase CLI (one-time)
npm install -g supabase

# Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
npx supabase db push
```

### 5. Generate TypeScript types (optional tapi recommended)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

### 6. Run dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 👥 User Roles & Login

### Murid
- **Login**: 6 digit akhir IC (contoh: `010345`)
- **Password default**: `skmkj@1010.murid1234` (kena tukar first login)
- **Access**: Refleksi harian, lihat skor sendiri, tempah sesi kaunseling

### Guru Kelas / Guru Disiplin
- **Login**: Email sekolah (contoh: `guru.disiplin@smkkj.edu.my`)
- **Access**: Lihat murid dalam kelas, tambah catatan/merit/kes disiplin

### GBK (Guru Bimbingan & Kaunseling)
- **Login**: Email sekolah (contoh: `gbk@smkkj.edu.my`)
- **Access**: Dashboard penuh, risk levels, intervention records, case management

### Ibu Bapa
- **Login**: Email peribadi (contoh: `ali.abu@gmail.com`)
- **Access**: Lihat perkembangan anak sahaja (no internal teacher notes)

### Pentadbir
- **Login**: Email sekolah
- **Access**: Full system access + user management + audit logs

## 📊 Database Schema

10 jadual utama:

1. **profiles** — semua pengguna (murid, guru, GBK, ibu bapa, pentadbir)
2. **checkins** — refleksi harian murid (10 soalan)
3. **risk_levels** — sistem amaran awal (hijau/kuning/jingga/merah)
4. **behavior_records** — rekod pelbagai sumber (kehadiran, merit, kes disiplin, catatan guru)
5. **intervention_records** — rekod tindakan GBK (case management)
6. **counseling_sessions** — tempahan sesi kaunseling
7. **badges** / **student_badges** — gamifikasi (lencana & ganjaran)
8. **points_tracker** — streak & total points
9. **notifications** — peringatan automatik
10. **audit_logs** — audit trail untuk privasi & keselamatan

**Security**: Row Level Security (RLS) enabled — setiap role hanya nampak data yang sepatutnya.

## 🔐 Security Features

- ✅ Row Level Security (RLS) untuk setiap jadual
- ✅ Audit logs (siapa akses data apa, bila)
- ✅ Password must change on first login (murid)
- ✅ Teacher notes hidden from parents (internal only)
- ✅ Intervention records hanya GBK/admin boleh akses
- ✅ Email/IC validation
- ✅ Rate limiting (Vercel Edge Middleware)

## 📦 Deployment (Production)

### Vercel (Recommended)

1. Push code ke GitHub
2. Import repo di [vercel.com](https://vercel.com)
3. Add environment variables (sama macam `.env.local`)
4. Deploy!

Auto-deploy setiap kali push ke `main` branch.

### Supabase Auth Redirect URLs

Tambah di Supabase dashboard → Authentication → URL Configuration:

```
http://localhost:3000/** (development)
https://kaunselingkjo.vercel.app/** (production)
```

## ✅ Status Semasa

Portal yang dah ada dalam repo sekarang:
- **Murid**: refleksi harian, lihat skor sendiri, reach out
- **GBK**: murid perlu perhatian, intervensi, pengurusan kes, history, print rekod
- **Guru**: senarai kelas, filter risiko, rekod merit/disiplin/catatan, rujuk GBK, profil murid + trend refleksi
- **Ibu bapa**: enabled di landing, daftar, paut anak ikut IC, dashboard perkembangan
- **Pentadbir**: kawal portal, pantau data sekolah
- **PWA**: installable + notifikasi browser untuk GBK (Reach Out / kes lewat)

## 🗺️ Roadmap Ringkas

### Selesai / hampir siap
- [x] Login / daftar akaun ibu bapa
- [x] Portal ibu bapa + demo
- [x] Reach Out inbox & badges
- [x] Pengurusan Kes GBK
- [x] Status kes + history log + overdue
- [x] Intervensi GBK disimpan dalam `intervention_records`
- [x] Rekod intervensi boleh dicetak

### Seterusnya
- [x] Portal guru + ibu bapa enable
- [x] Slip password export (`npm run export-slips`)
- [x] PWA + notifikasi browser GBK (Reach Out / overdue)
- [ ] Import senarai guru kelas (CSV) bila sekolah berikan
- [ ] Laporan / export PDF yang lebih cantik
- [ ] Badge auto-award + weekly_scores job

## 📝 Scripts

```bash
# Development
npm run dev

# Production
npm run build
npm run start

# Code quality
npm run lint
```

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)

## 📄 License

Proprietary — SK Mohd Khir Johari Internal Use Only

## 💬 Support

Untuk soalan atau bantuan:
- **Email**: admin@smkkj.edu.my

---

**Dibangunkan untuk**: SK Mohd Khir Johari  
**Tema**: STEM & TVET : PEMACU ASPIRASI KERJAYA DIGITAL GENERASI MADANI  
**Tahun**: 2026
