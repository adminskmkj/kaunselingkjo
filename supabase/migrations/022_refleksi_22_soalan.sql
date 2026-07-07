-- 022_refleksi_22_soalan.sql
--
-- Refleksi baru: 22 soalan, skala 1-5.
--   Disiplin (10): q1-q10
--   Emosi A - Kesedaran Emosi (5): q11-q15
--   Emosi B - Hubungan Sosial (3): q16-q18
--   Emosi C - Tekanan & Kebimbangan (4): q19-q22  (REVERSE: skor tinggi = sihat)
--
-- Skor:
--   discipline_score = (q1+q2+...+q10) / 50 * 100   → 0-100%
--   emotional_awareness_score = (q11+...+q15) / 25 * 100
--   emotional_social_score    = (q16+...+q18) / 15 * 100
--   emotional_stress_score    = ((6-q19)+...+(6-q22)) / 20 * 100  (reverse, tinggi=sihat)
--   emotional_score = avg(awareness, social, stress)  → 0-100%
--   total_score = avg(discipline, emotional)          → 0-100%

-- Tambah lajur q11-q22 (semua INTEGER, skala 1-5)
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS q11_emosi_gembira INTEGER,
  ADD COLUMN IF NOT EXISTS q12_emosi_tenang INTEGER,
  ADD COLUMN IF NOT EXISTS q13_emosi_sedar INTEGER,
  ADD COLUMN IF NOT EXISTS q14_emosi_kawal INTEGER,
  ADD COLUMN IF NOT EXISTS q15_emosi_senyum INTEGER,
  ADD COLUMN IF NOT EXISTS q16_sosial_diterima INTEGER,
  ADD COLUMN IF NOT EXISTS q17_sosial_sokongan INTEGER,
  ADD COLUMN IF NOT EXISTS q18_sosial_layanan INTEGER,
  ADD COLUMN IF NOT EXISTS q19_tekanan_risu INTEGER,
  ADD COLUMN IF NOT EXISTS q20_tekanan_takut INTEGER,
  ADD COLUMN IF NOT EXISTS q21_tekanan_marah INTEGER,
  ADD COLUMN IF NOT EXISTS q22_tekanan_yakin INTEGER;

-- Tambah lajur sub-skor emosi
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS emotional_awareness_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS emotional_social_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS emotional_stress_score NUMERIC(5,2);

COMMENT ON COLUMN public.checkins.q11_emosi_gembira IS 'Emosi A.1: Saya berasa gembira hari ini (1-5)';
COMMENT ON COLUMN public.checkins.q12_emosi_tenang IS 'Emosi A.2: Saya berasa tenang ketika berada di sekolah (1-5)';
COMMENT ON COLUMN public.checkins.q13_emosi_sedar IS 'Emosi A.3: Saya tahu perasaan yang saya alami hari ini (1-5)';
COMMENT ON COLUMN public.checkins.q14_emosi_kawal IS 'Emosi A.4: Saya dapat mengawal emosi apabila menghadapi masalah (1-5)';
COMMENT ON COLUMN public.checkins.q15_emosi_senyum IS 'Emosi A.5: Saya masih mampu tersenyum walaupun menghadapi cabaran (1-5)';
COMMENT ON COLUMN public.checkins.q16_sosial_diterima IS 'Emosi B.1: Saya berasa diterima oleh rakan-rakan (1-5)';
COMMENT ON COLUMN public.checkins.q17_sosial_sokongan IS 'Emosi B.2: Saya mempunyai seseorang untuk bercakap apabila sedih/risau (1-5)';
COMMENT ON COLUMN public.checkins.q18_sosial_layanan IS 'Emosi B.3: Saya melayan rakan dengan baik hari ini (1-5)';
COMMENT ON COLUMN public.checkins.q19_tekanan_risu IS 'Emosi C.1: Saya berasa risau/tertekan hari ini (1-5, REVERSE)';
COMMENT ON COLUMN public.checkins.q20_tekanan_takut IS 'Emosi C.2: Saya berasa takut datang ke sekolah (1-5, REVERSE)';
COMMENT ON COLUMN public.checkins.q21_tekanan_marah IS 'Emosi C.3: Saya mudah marah hari ini (1-5, REVERSE)';
COMMENT ON COLUMN public.checkins.q22_tekanan_yakin IS 'Emosi C.4: Saya berasa yakin dengan diri saya hari ini (1-5)';
COMMENT ON COLUMN public.checkins.emotional_awareness_score IS 'Emosi A (q11-q15), 0-100%';
COMMENT ON COLUMN public.checkins.emotional_social_score IS 'Emosi B (q16-q18), 0-100%';
COMMENT ON COLUMN public.checkins.emotional_stress_score IS 'Emosi C (q19-q22, reverse), 0-100%. Tinggi = sihat';

-- Update trigger: kira skor baru
CREATE OR REPLACE FUNCTION public.calculate_checkin_score()
RETURNS TRIGGER AS $$
DECLARE
    disc_raw NUMERIC;
    aware_raw NUMERIC;
    social_raw NUMERIC;
    stress_raw NUMERIC;
    stress_reversed NUMERIC;
BEGIN
    -- Disiplin: q1-q10, max 50
    disc_raw := COALESCE(NEW.q1_kehadiran_ketepatan, 0)
              + COALESCE(NEW.q2_pematuhan_peraturan, 0)
              + COALESCE(NEW.q3_penyiapan_tugasan, 0)
              + COALESCE(NEW.q4_kebersihan, 0)
              + COALESCE(NEW.q5_komunikasi_sopan, 0)
              + COALESCE(NEW.q6_motivasi_belajar, 0)
              + COALESCE(NEW.q7_perasaan_emosi, 0)
              + COALESCE(NEW.q8_hubungan_rakan, 0)
              + COALESCE(NEW.q9_tahap_stres, 0)
              + COALESCE(NEW.q10_perlukan_bantuan, 0);
    -- ponytail: q7/q10 legacy masih TEXT enum; jika NULL, fallback 0. Skor disiplin
    -- mungkin rendah untuk rekod lama. Untuk rekod baru, q7/q10 tak digunakan lagi.
    NEW.discipline_score := (disc_raw / 50.0) * 100;

    -- Emosi A: Kesedaran (q11-q15), max 25
    aware_raw := COALESCE(NEW.q11_emosi_gembira, 0)
               + COALESCE(NEW.q12_emosi_tenang, 0)
               + COALESCE(NEW.q13_emosi_sedar, 0)
               + COALESCE(NEW.q14_emosi_kawal, 0)
               + COALESCE(NEW.q15_emosi_senyum, 0);
    NEW.emotional_awareness_score := (aware_raw / 25.0) * 100;

    -- Emosi B: Hubungan Sosial (q16-q18), max 15
    social_raw := COALESCE(NEW.q16_sosial_diterima, 0)
                + COALESCE(NEW.q17_sosial_sokongan, 0)
                + COALESCE(NEW.q18_sosial_layanan, 0);
    NEW.emotional_social_score := (social_raw / 15.0) * 100;

    -- Emosi C: Tekanan (q19-q22), REVERSE (6 - jawapan), max 20
    -- Tinggi = sihat (murid TIDAK tertekan)
    stress_reversed := (6 - COALESCE(NEW.q19_tekanan_risu, 3))
                     + (6 - COALESCE(NEW.q20_tekanan_takut, 3))
                     + (6 - COALESCE(NEW.q21_tekanan_marah, 3))
                     + (6 - COALESCE(NEW.q22_tekanan_yakin, 3));
    NEW.emotional_stress_score := (stress_reversed / 20.0) * 100;

    -- Emosi gabungan = purata 3 sub-skor
    NEW.emotional_score := (
        COALESCE(NEW.emotional_awareness_score, 0)
        + COALESCE(NEW.emotional_social_score, 0)
        + COALESCE(NEW.emotional_stress_score, 0)
    ) / 3.0;

    -- Total = avg(discipline, emotional)
    NEW.total_score := (NEW.discipline_score + NEW.emotional_score) / 2.0;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update risk level: guna emotional_score baru + isyarat q19-q22 (tekanan)
CREATE OR REPLACE FUNCTION public.calculate_risk_level_from_checkin()
RETURNS TRIGGER AS $$
DECLARE
    v_level risk_level;
    v_reason TEXT;
    emo NUMERIC;
    stress_raw NUMERIC;
BEGIN
    emo := COALESCE(NEW.emotional_score, 0);
    -- stress_raw = jumlah q19-q22 (sebelum reverse). Tinggi = tertekan.
    stress_raw := COALESCE(NEW.q19_tekanan_risu, 3)
                + COALESCE(NEW.q20_tekanan_takut, 3)
                + COALESCE(NEW.q21_tekanan_marah, 3)
                + COALESCE(NEW.q22_tekanan_yakin, 3);

    -- q22 (yakin) adalah positif, jadi untuk detection tekanan, reverse q22 sahaja
    -- q22 tinggi = yakin = baik. q19,q20,q21 tinggi = tertekan = buruk.
    -- ponytail: guna stress_score (reverse) untuk threshold, bukan raw
    IF emo < 40 OR COALESCE(NEW.emotional_stress_score, 0) < 30 THEN
        v_level := 'merah';
        v_reason := 'Skor emosi rendah / tekanan tinggi; perlu tindakan segera.';
    ELSIF emo < 55 OR COALESCE(NEW.emotional_stress_score, 0) < 50 THEN
        v_level := 'jingga';
        v_reason := 'Skor emosi sederhana-rendah / tekanan meningkat; perlu pantauan.';
    ELSIF emo < 70 THEN
        v_level := 'kuning';
        v_reason := 'Skor emosi sederhana; perlu dipantau.';
    ELSE
        v_level := 'hijau';
        v_reason := 'Skor emosi stabil.';
    END IF;

    UPDATE public.risk_levels
    SET is_active = FALSE
    WHERE student_id = NEW.student_id
      AND is_active = TRUE;

    INSERT INTO public.risk_levels (student_id, level, reason, calculated_at, is_active)
    VALUES (NEW.student_id, v_level, v_reason, NOW(), TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
