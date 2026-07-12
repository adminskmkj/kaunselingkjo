-- 029_checkins_scale_1_to_5.sql
--
-- Punca gagal simpan refleksi (selepas 027):
--   Form guna skala 1-5, tetapi CHECK constraints lama masih BETWEEN 1 AND 3
--   → checkins_q1_kehadiran_ketepatan_check (dan rakan) dilanggar
--
-- Jalankan di Supabase SQL Editor.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop semua CHECK constraint pada checkins yang rujuk skala 1-3 lama
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'checkins'
      AND c.contype = 'c'
      AND (
        c.conname LIKE 'checkins_q%'
        OR pg_get_constraintdef(c.oid) ILIKE '%BETWEEN 1 AND 3%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint %', r.conname;
  END LOOP;
END $$;

-- Pastikan lajur soalan integer 1-5 (nama legacy + q11-q22)
ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_q1_scale CHECK (q1_kehadiran_ketepatan IS NULL OR q1_kehadiran_ketepatan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q2_scale CHECK (q2_pematuhan_peraturan IS NULL OR q2_pematuhan_peraturan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q3_scale CHECK (q3_penyiapan_tugasan IS NULL OR q3_penyiapan_tugasan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q4_scale CHECK (q4_kebersihan IS NULL OR q4_kebersihan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q5_scale CHECK (q5_komunikasi_sopan IS NULL OR q5_komunikasi_sopan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q6_scale CHECK (q6_motivasi_belajar IS NULL OR q6_motivasi_belajar BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q7_scale CHECK (q7_perasaan_emosi IS NULL OR q7_perasaan_emosi BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q8_scale CHECK (q8_hubungan_rakan IS NULL OR q8_hubungan_rakan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q9_scale CHECK (q9_tahap_stres IS NULL OR q9_tahap_stres BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q10_scale CHECK (q10_perlukan_bantuan IS NULL OR q10_perlukan_bantuan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q11_scale CHECK (q11_emosi_gembira IS NULL OR q11_emosi_gembira BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q12_scale CHECK (q12_emosi_tenang IS NULL OR q12_emosi_tenang BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q13_scale CHECK (q13_emosi_sedar IS NULL OR q13_emosi_sedar BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q14_scale CHECK (q14_emosi_kawal IS NULL OR q14_emosi_kawal BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q15_scale CHECK (q15_emosi_senyum IS NULL OR q15_emosi_senyum BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q16_scale CHECK (q16_sosial_diterima IS NULL OR q16_sosial_diterima BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q17_scale CHECK (q17_sosial_sokongan IS NULL OR q17_sosial_sokongan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q18_scale CHECK (q18_sosial_layanan IS NULL OR q18_sosial_layanan BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q19_scale CHECK (q19_tekanan_risu IS NULL OR q19_tekanan_risu BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q20_scale CHECK (q20_tekanan_takut IS NULL OR q20_tekanan_takut BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q21_scale CHECK (q21_tekanan_marah IS NULL OR q21_tekanan_marah BETWEEN 1 AND 5),
  ADD CONSTRAINT checkins_q22_scale CHECK (q22_tekanan_yakin IS NULL OR q22_tekanan_yakin BETWEEN 1 AND 5);

-- Drop duplicate range constraints dari 027 jika wujud
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_q7_range;
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_q10_range;
