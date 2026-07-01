# S.T.A.R KJo - Student Tracker Attitude Report

Sistem pemantauan tingkah laku dan intervensi awal murid SMK Kampung Jawa.

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
https://star-kjo.vercel.app/** (production)
```

## 🎮 Development Roadmap

### ✅ Fasa 1 (Setup) — DONE
- [x] Next.js project structure
- [x] Database schema (10 jadual)
- [x] RLS policies (role-based access)
- [x] Supabase integration
- [x] TypeScript types

### 🚧 Fasa 2 (Core Features) — IN PROGRESS
- [ ] Auth pages (login/signup/reset password)
- [ ] Murid portal (refleksi form + dashboard)
- [ ] GBK dashboard (risk levels + intervention tracking)
- [ ] Guru portal (catatan + behavior records)
- [ ] Ibu bapa portal (read-only child progress)

### 📋 Fasa 3 (Advanced Features)
- [ ] Weekly score aggregation (cron job)
- [ ] Auto-calculate risk levels (trigger)
- [ ] Badge awarding system
- [ ] Notification system (email/push)
- [ ] Export reports (PDF/Excel)

### 🤖 Fasa 4 (AI Integration)
- [ ] AI recommendations (Gemini API)
- [ ] Trend analysis & predictions
- [ ] Auto-prioritize intervention list

### 🔗 Fasa 5 (External Integration)
- [ ] Link sistem kehadiran KJo (APDM webhook)
- [ ] SMS notifications (ibu bapa)
- [ ] WhatsApp bot (optional)

## 📝 Scripts

```bash
# Development
npm run dev          # Run dev server (Turbopack)

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run migrations (custom script)
npm run db:seed      # Seed test data

# Code quality
npm run lint         # ESLint check
```

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)

## 🤝 Contributing

1. Fork repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Proprietary — SMK Kampung Jawa Internal Use Only

## 💬 Support

Untuk soalan atau bantuan:
- **Email**: admin@smkkj.edu.my
- **GitHub Issues**: [Create issue](https://github.com/YOUR_ORG/star-kjo/issues)

---

**Dibangunkan untuk**: SMK Kampung Jawa  
**Tema**: STEM & TVET : PEMACU ASPIRASI KERJAYA DIGITAL GENERASI MADANI  
**Tahun**: 2026
