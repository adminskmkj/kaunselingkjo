-- 010_separate_checkin_scores.sql
-- Pisahkan skor disiplin (Bahagian A) dan emosi (Bahagian B + q7 + q10).
-- Risk level GBK berdasarkan emotional_score + isyarat explicit, BUKAN skor gabungan.

ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS discipline_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS emotional_score NUMERIC(5,2);

COMMENT ON COLUMN public.checkins.discipline_score IS 'Bahagian A (q1-q5), 0-100%';
COMMENT ON COLUMN public.checkins.emotional_score IS 'Bahagian B + emosi + bantuan (q6,q7,q8,q9,q10), 0-100%';
COMMENT ON COLUMN public.checkins.total_score IS 'Legacy gabungan; jangan guna untuk risk. Sama (disiplin+emosi)/2 untuk rujukan.';

CREATE OR REPLACE FUNCTION public.calculate_checkin_score()
RETURNS TRIGGER AS $$
DECLARE
    bahagian_a NUMERIC;
    bahagian_b NUMERIC;
    q7_score NUMERIC;
    q10_score NUMERIC;
    emo_raw NUMERIC;
BEGIN
    bahagian_a := COALESCE(NEW.q1_kehadiran_ketepatan, 0) +
                  COALESCE(NEW.q2_pematuhan_peraturan, 0) +
                  COALESCE(NEW.q3_penyiapan_tugasan, 0) +
                  COALESCE(NEW.q4_kebersihan, 0) +
                  COALESCE(NEW.q5_komunikasi_sopan, 0);

    bahagian_b := COALESCE(NEW.q6_motivasi_belajar, 0) +
                  COALESCE(NEW.q8_hubungan_rakan, 0) +
                  COALESCE(NEW.q9_tahap_stres, 0);

    q7_score := CASE NEW.q7_perasaan_emosi
        WHEN 'gembira' THEN 3
        WHEN 'biasa' THEN 2
        WHEN 'sedih' THEN 1
        WHEN 'tertekan' THEN 1
        ELSE 0
    END;

    q10_score := CASE NEW.q10_perlukan_bantuan
        WHEN 'tidak' THEN 3
        WHEN 'mungkin' THEN 2
        WHEN 'ya' THEN 1
        ELSE 0
    END;

    NEW.discipline_score := (bahagian_a / 15.0) * 100;
    emo_raw := bahagian_b + q7_score + q10_score;
    NEW.emotional_score := (emo_raw / 15.0) * 100;
    NEW.total_score := (NEW.discipline_score + NEW.emotional_score) / 2.0;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS checkins_calculate_score ON public.checkins;
CREATE TRIGGER checkins_calculate_score
    BEFORE INSERT OR UPDATE ON public.checkins
    FOR EACH ROW EXECUTE FUNCTION public.calculate_checkin_score();

CREATE OR REPLACE FUNCTION public.calculate_risk_level_from_checkin()
RETURNS TRIGGER AS $$
DECLARE
    v_level risk_level;
    v_reason TEXT;
    emo NUMERIC;
BEGIN
    emo := COALESCE(NEW.emotional_score, 0);

    IF NEW.q10_perlukan_bantuan = 'ya'
       OR NEW.q7_perasaan_emosi IN ('sedih', 'tertekan')
       OR NEW.q9_tahap_stres = 1
       OR emo < 40 THEN
        v_level := 'merah';
        v_reason := 'Isyarat emosi/stres atau murid memerlukan bantuan; perlu tindakan segera.';
    ELSIF NEW.q10_perlukan_bantuan = 'mungkin'
       OR NEW.q9_tahap_stres = 2
       OR emo < 55 THEN
        v_level := 'jingga';
        v_reason := 'Skor emosi rendah atau murid mungkin perlukan bantuan.';
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

DROP TRIGGER IF EXISTS checkins_update_risk_level ON public.checkins;
CREATE TRIGGER checkins_update_risk_level
    AFTER INSERT OR UPDATE ON public.checkins
    FOR EACH ROW EXECUTE FUNCTION public.calculate_risk_level_from_checkin();

-- Backfill skor dari jawapan sedia ada (picu trigger BEFORE)
UPDATE public.checkins
SET q1_kehadiran_ketepatan = q1_kehadiran_ketepatan
WHERE discipline_score IS NULL OR emotional_score IS NULL;

-- Backfill risk aktif ikut checkin terkini (selepas skor emosi dikira)
WITH latest AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        emotional_score,
        q7_perasaan_emosi,
        q9_tahap_stres,
        q10_perlukan_bantuan
    FROM public.checkins
    ORDER BY student_id, checkin_date DESC, created_at DESC
), cleared AS (
    UPDATE public.risk_levels rl
    SET is_active = FALSE
    WHERE rl.student_id IN (SELECT student_id FROM latest)
      AND rl.is_active = TRUE
    RETURNING rl.student_id
)
INSERT INTO public.risk_levels (student_id, level, reason, calculated_at, is_active)
SELECT
    l.student_id,
    CASE
        WHEN l.q10_perlukan_bantuan = 'ya'
          OR l.q7_perasaan_emosi IN ('sedih', 'tertekan')
          OR l.q9_tahap_stres = 1
          OR COALESCE(l.emotional_score, 0) < 40 THEN 'merah'::risk_level
        WHEN l.q10_perlukan_bantuan = 'mungkin'
          OR l.q9_tahap_stres = 2
          OR COALESCE(l.emotional_score, 0) < 55 THEN 'jingga'::risk_level
        WHEN COALESCE(l.emotional_score, 0) < 70 THEN 'kuning'::risk_level
        ELSE 'hijau'::risk_level
    END,
    CASE
        WHEN l.q10_perlukan_bantuan = 'ya'
          OR l.q7_perasaan_emosi IN ('sedih', 'tertekan')
          OR l.q9_tahap_stres = 1
          OR COALESCE(l.emotional_score, 0) < 40 THEN 'Isyarat emosi/stres atau murid memerlukan bantuan; perlu tindakan segera.'
        WHEN l.q10_perlukan_bantuan = 'mungkin'
          OR l.q9_tahap_stres = 2
          OR COALESCE(l.emotional_score, 0) < 55 THEN 'Skor emosi rendah atau murid mungkin perlukan bantuan.'
        WHEN COALESCE(l.emotional_score, 0) < 70 THEN 'Skor emosi sederhana; perlu dipantau.'
        ELSE 'Skor emosi stabil.'
    END,
    NOW(),
    TRUE
FROM latest l;