-- 027_checkins_q7_q10_to_integer.sql
--
-- Punca gagal simpan refleksi:
--   form hantar q7/q10 sebagai INTEGER 1-5
--   DB masih enum emotion_type / need_help
--   → "COALESCE types emotion_type and integer cannot be matched"
--
-- Jalankan di Supabase SQL Editor (satu Run OK).

-- 0) Drop trigger yang rujuk q7/q10 enum
DROP TRIGGER IF EXISTS checkins_sync_reach_out ON public.checkins;
DROP TRIGGER IF EXISTS checkins_create_reach_out ON public.checkins;
DROP TRIGGER IF EXISTS trg_create_reach_out_from_checkin ON public.checkins;
DROP TRIGGER IF EXISTS checkins_calculate_score ON public.checkins;
DROP TRIGGER IF EXISTS checkins_calculate_score_trigger ON public.checkins;
DROP TRIGGER IF EXISTS trg_calculate_checkin_score ON public.checkins;

-- 1) Tukar q7 → INTEGER (map rekod lama)
ALTER TABLE public.checkins
  ALTER COLUMN q7_perasaan_emosi DROP DEFAULT;

ALTER TABLE public.checkins
  ALTER COLUMN q7_perasaan_emosi TYPE INTEGER
  USING (
    CASE q7_perasaan_emosi::text
      WHEN 'gembira' THEN 5
      WHEN 'biasa' THEN 3
      WHEN 'sedih' THEN 2
      WHEN 'tertekan' THEN 1
      ELSE NULL
    END
  );

-- 2) Tukar q10 → INTEGER
ALTER TABLE public.checkins
  ALTER COLUMN q10_perlukan_bantuan DROP DEFAULT;

ALTER TABLE public.checkins
  ALTER COLUMN q10_perlukan_bantuan TYPE INTEGER
  USING (
    CASE q10_perlukan_bantuan::text
      WHEN 'tidak' THEN 5
      WHEN 'mungkin' THEN 3
      WHEN 'ya' THEN 1
      ELSE NULL
    END
  );

-- 3) Constraints skala 1-5 (drop dulu jika wujud)
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_q7_range;
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_q10_range;
ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_q7_range CHECK (q7_perasaan_emosi IS NULL OR (q7_perasaan_emosi BETWEEN 1 AND 5)),
  ADD CONSTRAINT checkins_q10_range CHECK (q10_perlukan_bantuan IS NULL OR (q10_perlukan_bantuan BETWEEN 1 AND 5));

COMMENT ON COLUMN public.checkins.q7_perasaan_emosi IS 'Disiplin Q7 (1-5 integer)';
COMMENT ON COLUMN public.checkins.q10_perlukan_bantuan IS 'Disiplin Q10 (1-5 integer; legacy name, bukan enum need_help)';

-- 4) Trigger skor (semua integer)
CREATE OR REPLACE FUNCTION public.calculate_checkin_score()
RETURNS TRIGGER AS $$
DECLARE
    disc_raw NUMERIC;
    aware_raw NUMERIC;
    social_raw NUMERIC;
    stress_reversed NUMERIC;
BEGIN
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
    NEW.discipline_score := (disc_raw / 50.0) * 100;

    aware_raw := COALESCE(NEW.q11_emosi_gembira, 0)
               + COALESCE(NEW.q12_emosi_tenang, 0)
               + COALESCE(NEW.q13_emosi_sedar, 0)
               + COALESCE(NEW.q14_emosi_kawal, 0)
               + COALESCE(NEW.q15_emosi_senyum, 0);
    NEW.emotional_awareness_score := (aware_raw / 25.0) * 100;

    social_raw := COALESCE(NEW.q16_sosial_diterima, 0)
                + COALESCE(NEW.q17_sosial_sokongan, 0)
                + COALESCE(NEW.q18_sosial_layanan, 0);
    NEW.emotional_social_score := (social_raw / 15.0) * 100;

    -- q19-q22 semua reverse (tinggi setuju = lebih tertekan / tidak yakin = kurang sihat)
    stress_reversed := (6 - COALESCE(NEW.q19_tekanan_risu, 3))
                     + (6 - COALESCE(NEW.q20_tekanan_takut, 3))
                     + (6 - COALESCE(NEW.q21_tekanan_marah, 3))
                     + (6 - COALESCE(NEW.q22_tekanan_yakin, 3));
    NEW.emotional_stress_score := (stress_reversed / 20.0) * 100;

    NEW.emotional_score := (
        COALESCE(NEW.emotional_awareness_score, 0)
        + COALESCE(NEW.emotional_social_score, 0)
        + COALESCE(NEW.emotional_stress_score, 0)
    ) / 3.0;

    NEW.total_score := (NEW.discipline_score + NEW.emotional_score) / 2.0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS checkins_calculate_score ON public.checkins;
CREATE TRIGGER checkins_calculate_score
  BEFORE INSERT OR UPDATE ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_checkin_score();

-- 5) Risk level (tanpa enum q10)
CREATE OR REPLACE FUNCTION public.calculate_risk_level_from_checkin()
RETURNS TRIGGER AS $$
DECLARE
    v_level risk_level;
    v_reason TEXT;
    emo NUMERIC;
BEGIN
    emo := COALESCE(NEW.emotional_score, 0);

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
    WHERE student_id = NEW.student_id AND is_active = TRUE;

    INSERT INTO public.risk_levels (student_id, level, reason, calculated_at, is_active)
    VALUES (NEW.student_id, v_level, v_reason, NOW(), TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pastikan trigger risk wujud (nama biasa dari 008/010/022)
DROP TRIGGER IF EXISTS checkins_update_risk_level ON public.checkins;
DROP TRIGGER IF EXISTS trg_checkins_risk_level ON public.checkins;
CREATE TRIGGER checkins_update_risk_level
  AFTER INSERT OR UPDATE ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_risk_level_from_checkin();

-- 6) Reach-out auto: isyarat tekanan (q19-q21), ganti q10 enum
CREATE OR REPLACE FUNCTION public.sync_reach_out_from_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg TEXT;
  stress_flag BOOLEAN;
BEGIN
  stress_flag := (
    (CASE WHEN COALESCE(NEW.q19_tekanan_risu, 0) >= 4 THEN 1 ELSE 0 END)
  + (CASE WHEN COALESCE(NEW.q20_tekanan_takut, 0) >= 4 THEN 1 ELSE 0 END)
  + (CASE WHEN COALESCE(NEW.q21_tekanan_marah, 0) >= 4 THEN 1 ELSE 0 END)
  ) >= 2
  OR COALESCE(NEW.emotional_score, 100) < 40;

  IF NOT stress_flag THEN
    RETURN NEW;
  END IF;

  msg := format(
    'Isyarat refleksi: skor emosi %s%%. Tekanan q19/q20/q21 = %s/%s/%s. Tidak yakin q22 = %s.',
    ROUND(COALESCE(NEW.emotional_score, 0))::text,
    COALESCE(NEW.q19_tekanan_risu, 0)::text,
    COALESCE(NEW.q20_tekanan_takut, 0)::text,
    COALESCE(NEW.q21_tekanan_marah, 0)::text,
    COALESCE(NEW.q22_tekanan_yakin, 0)::text
  );

  INSERT INTO public.reach_out_messages (student_id, sender_id, message, source, checkin_id, status)
  VALUES (NEW.student_id, NEW.student_id, msg, 'refleksi', NEW.id, 'baru')
  ON CONFLICT (checkin_id) DO UPDATE SET
    message = EXCLUDED.message,
    status = CASE
      WHEN reach_out_messages.status = 'ditutup' THEN reach_out_messages.status
      ELSE 'baru'
    END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- jangan gagalkan checkin kalau reach_out gagal
    RETURN NEW;
END;
$$;

CREATE TRIGGER checkins_sync_reach_out
  AFTER INSERT OR UPDATE OF q19_tekanan_risu, q20_tekanan_takut, q21_tekanan_marah, emotional_score
  ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reach_out_from_checkin();
