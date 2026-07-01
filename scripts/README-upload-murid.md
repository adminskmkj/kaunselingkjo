# Upload Murid dari Excel KPM

Script untuk sync data murid dari Excel KPM (format JBA1010) ke Supabase.

## Prasyarat

1. `.env.local` dah setup dengan:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

2. Migrations dah run (profiles table + RLS dah siap)

## Cara Guna

1. **Dapatkan Excel terkini** dari sistem KPM (contoh: `JBA1010 Keseluruhan Murid as of 2026-06-28.xlsx`)

2. **Run script**:

   ```bash
   npm run upload-murid "C:/Users/user/Downloads/JBA1010 Keseluruhan Murid.xlsx"
   ```

   Atau path penuh:

   ```bash
   npm run upload-murid "C:/Users/user/Downloads/Telegram Desktop/JBA1010 Keseluruhan Murid as of 2026-06-28.xlsx"
   ```

3. **Preview changes**:

   Script akan tunjukkan:
   - 🆕 Murid baru (akan create akaun)
   - 🔄 Murid existing yang kelas berubah (akan update)
   - ❌ Murid dalam DB tapi tak ada dalam Excel (akan diabaikan, **tidak auto-delete**)

4. **Confirm**:

   ```text
   Proceed with changes? (yes/no): yes
   ```

5. **Script akan**:
   - Create Supabase Auth account untuk murid baru
   - Email: `{6_digit_akhir_IC}@student.smkkj.edu.my`
   - Password default: `skmkj@1010.murid1234`
   - Insert/update `profiles` table
   - Set `must_change_password = true`

## Format Excel

Script expect header KPM standard:
- `NAMA`
- `NO. PENGENALAN` (IC 12 digit)
- `NAMA KELAS`
- `JANTINA`

## Login Credentials Murid

Selepas upload, murid boleh login dengan:

- **Username**: 6 digit akhir IC (contoh: IC `200106070282` → login `070282`)
- **Password**: `skmkj@1010.murid1234`
- First login kena tukar password

## Delete Manual

Script **tidak auto-delete** murid yang tak ada dalam Excel (untuk safety).

Kalau perlu delete murid yang dah pindah/keluar:

1. Pergi Supabase dashboard → Authentication → Users
2. Cari user by email (`{ic}@student.smkkj.edu.my`)
3. Delete user (cascade akan delete profile sekali)

Atau buat script `delete-murid.js` berasingan kalau perlu bulk delete.

## Troubleshooting

**"Auth error: User already registered"**
- Murid dah ada dalam system
- Check email conflict atau IC duplicate

**"Profile error: duplicate key value"**
- `ic_or_student_id` dah wujud
- Mungkin IC sama dalam Excel (data entry error)

**Excel parse error**
- Pastikan format Excel betul (`.xlsx`)
- Header baris 7, data mula baris 8 (standard KPM)

## Automated Sync (Future)

Untuk sync automatic setiap semester/tahun:

```bash
# Setup cron job (Linux/Mac) atau Task Scheduler (Windows)
# Run setiap awal tahun persekolahan
0 8 1 1 * cd /path/to/star-kjo && npm run upload-murid /path/to/latest-excel.xlsx
```

Atau integrate dengan KPM API kalau ada (future).
