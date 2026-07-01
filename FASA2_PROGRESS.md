# S.T.A.R KJo - Fasa 2 Progress

## ✅ Yang Dah Siap (Partial)

### 1. Authentication System

**Auth Context** (`lib/auth-context.tsx`):
- ✅ React Context untuk global auth state
- ✅ Auto-detect login type: IC (6 digit) vs Email
- ✅ Session persistence
- ✅ Auto-refresh profile on auth change

**Login Page** (`/login`):
- ✅ Universal login form (murid + guru + GBK + ibu bapa)
- ✅ Auto-detect format: IC → student lookup, Email → direct login
- ✅ Error handling & loading states
- ✅ Responsive design

**Dashboard Router** (`/dashboard`):
- ✅ Auto-redirect berdasarkan role:
  - `student` → `/murid`
  - `counselor` → `/gbk`
  - `class_teacher` / `discipline_teacher` → `/guru`
  - `parent` → `/ibu-bapa`
  - `admin` → `/pentadbir`

### 2. Murid Portal (COMPLETE ✅)

**Dashboard** (`/murid`):
- ✅ Stats cards (streak, total points, today score)
- ✅ Check today's checkin status
- ✅ Action cards (Refleksi Harian, Tempah Sesi)
- ✅ Quick links (Sejarah, Lencana, Sesi, Profil)
- ✅ Header dengan nama + kelas
- ✅ Log keluar button

**Refleksi Form** (`/murid/refleksi`):
- ✅ 10 soalan interactive (Bahagian A + B)
- ✅ Emoji/visual rating scales (1-3)
- ✅ Emotion picker (gembira/biasa/sedih/tertekan)
- ✅ Need help picker (ya/mungkin/tidak)
- ✅ Auto-submit ke `checkins` table
- ✅ Success feedback + auto-redirect
- ✅ Prevent double submission (checked on dashboard)

### 3. Landing Page Update

- ✅ "Log Masuk" button prominent
- ✅ Role cards display
- ✅ Tema STEM & TVET footer

---

## 🚧 Yang Belum Siap (Fasa 2 Remaining)

### Murid Portal (remaining pages)

- [ ] `/murid/sejarah` — history refleksi (table/chart)
- [ ] `/murid/lencana` — badges earned + progress
- [ ] `/murid/tempah-sesi` — booking form
- [ ] `/murid/sesi` — upcoming/past counseling sessions
- [ ] `/murid/profil` — view/edit profile + change password

### GBK Portal (`/gbk`)

- [ ] Dashboard overview (stats, risk distribution)
- [ ] Risk levels table (hijau/kuning/jingga/merah)
- [ ] Intervention records (case management CRUD)
- [ ] Counseling sessions calendar
- [ ] Student detail view (full history)
- [ ] Export reports

### Guru Portal (`/guru`)

- [ ] Murid list (filter by class)
- [ ] Add behavior record form (merit/discipline/note)
- [ ] View student trends
- [ ] Quick actions

### Ibu Bapa Portal (`/ibu-bapa`)

- [ ] Children list (if multiple)
- [ ] Child progress dashboard (read-only)
- [ ] Weekly summary
- [ ] Upcoming sessions

### Pentadbir Portal (`/pentadbir`)

- [ ] School-wide stats
- [ ] User management
- [ ] Audit logs viewer
- [ ] System settings

---

## 🔧 Known Issues / Notes

### 1. Student Login Pattern

**Current implementation**:
```
IC: 010345 → email: 010345@student.smkkj.edu.my
```

**Problem**: Supabase Auth needs actual email. Kena provision users with constructed email pattern ni, OR guna different approach:

**Solution A** (recommended): Bulk provision script
```js
// scripts/provision-students.js
// Read CSV of students (IC, name, class)
// For each student:
//   - signUp with email = `${ic}@student.smkkj.edu.my`
//   - password = 'skmkj@1010.murid1234'
//   - Insert profile with ic_or_student_id = ic
//   - Set must_change_password = true
```

**Solution B**: Custom auth (more complex, skip untuk demo)

### 2. RLS Policies Testing

Belum test actual RLS behaviour sebab:
- No real users provisioned yet
- Dev mode pakai service role (bypass RLS)

Kena test bila dah provision users real.

### 3. Missing Features (Fasa 3)

- Auto-calculate weekly_scores (cron job)
- Auto-update risk_levels based on trends
- Badge awarding logic
- Notification system
- Email/SMS alerts

---

## 📋 Next Immediate Steps

### Priority 1: Complete Murid Portal
Finish remaining murid pages supaya ada 1 complete user journey untuk demo:
1. Sejarah refleksi (simple table with date + score)
2. Lencana page (badges grid)
3. Tempah sesi form (simple booking)

### Priority 2: User Provisioning
Buat script untuk bulk create student accounts:
- Read from CSV/Excel
- Create Supabase Auth users
- Insert profiles
- Set default password

### Priority 3: GBK Dashboard
Paling critical untuk stakeholders:
- Risk levels view (main value prop)
- Intervention records CRUD

---

## 🎯 Demo-Ready Checklist

Untuk demo ke PPD/JPN, minimum perlu:

**Functional**:
- [x] Login (murid)
- [x] Murid dashboard (stats display)
- [x] Refleksi form (10 soalan submit)
- [ ] Sejarah refleksi (view past entries)
- [ ] GBK dashboard (view risk levels)
- [ ] GBK intervention (add case note)

**Data**:
- [ ] 10-20 dummy students provisioned
- [ ] Some students with checkin history (5-7 days)
- [ ] 2-3 students dengan different risk levels
- [ ] 1-2 intervention records (sample case notes)

**Visual**:
- [x] Clean UI (Tailwind styled)
- [x] Responsive (mobile + desktop)
- [x] Emoji/icons (engaging)
- [ ] Charts (untuk trend visualization — Recharts)

---

## 📊 Current File Structure

```
D:/apps/star-kjo/
├── app/
│   ├── page.tsx                    ✅ Landing (updated)
│   ├── layout.tsx                  ✅ Root layout + AuthProvider
│   ├── login/
│   │   └── page.tsx                ✅ Login page
│   ├── dashboard/
│   │   └── page.tsx                ✅ Role router
│   ├── murid/
│   │   ├── page.tsx                ✅ Murid dashboard
│   │   ├── refleksi/page.tsx       ✅ Refleksi form
│   │   ├── sejarah/page.tsx        ❌ TODO
│   │   ├── lencana/page.tsx        ❌ TODO
│   │   ├── tempah-sesi/page.tsx    ❌ TODO
│   │   ├── sesi/page.tsx           ❌ TODO
│   │   └── profil/page.tsx         ❌ TODO
│   ├── gbk/                        ❌ TODO (entire portal)
│   ├── guru/                       ❌ TODO (entire portal)
│   ├── ibu-bapa/                   ❌ TODO (entire portal)
│   └── pentadbir/                  ❌ TODO (entire portal)
├── lib/
│   ├── supabase.ts                 ✅ Client config
│   └── auth-context.tsx            ✅ Auth provider
├── components/                     ❌ TODO (reusable components)
└── supabase/migrations/            ✅ Schema done
```

---

## 🚀 Commands

```bash
# Development
npm run dev              # Running on http://localhost:3000

# Test flow
1. Visit http://localhost:3000
2. Click "Log Masuk"
3. Login with IC: 010345 (will fail until user provisioned)
4. OR setup Supabase first + run provision script

# Git
git log --oneline        # View commits
git status               # Check changes
```

---

**Status**: Fasa 2 ~40% DONE  
**Completed**: Auth system + Murid portal core (dashboard + refleksi)  
**Next**: Murid remaining pages + GBK dashboard  
**Blocker**: Need Supabase project setup + user provisioning untuk test real flow
