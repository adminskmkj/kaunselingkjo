-- 008_risk_levels_on_checkin.sql
-- Auto-calculate active risk_levels row whenever a student submits/updates a checkin.
-- Rule v1:
--   merah  = q10_perlukan_bantuan = 'ya' OR total_score < 40
--   jingga = q10_perlukan_bantuan = 'mungkin' OR total_score < 55
--   kuning = total_score < 70
--   hijau  = total_score >= 70
-- This runs after checkins_calculate_score so NEW.total_score is already populated.

CREATE OR REPLACE FUNCTION public.calculate_risk_level_from_checkin()
RETURNS TRIGGER AS $$
DECLARE
    v_level risk_level;
    v_reason TEXT;
BEGIN
    IF NEW.q10_perlukan_bantuan = 'ya' OR COALESCE(NEW.total_score, 0) < 40 THEN
        v_level := 'merah';
        v_reason := 'Skor refleksi sangat rendah atau murid menyatakan perlukan bantuan.';
    ELSIF NEW.q10_perlukan_bantuan = 'mungkin' OR COALESCE(NEW.total_score, 0) < 55 THEN
        v_level := 'jingga';
        v_reason := 'Skor refleksi rendah atau murid mungkin perlukan bantuan.';
    ELSIF COALESCE(NEW.total_score, 0) < 70 THEN
        v_level := 'kuning';
        v_reason := 'Skor refleksi sederhana rendah; perlu dipantau.';
    ELSE
        v_level := 'hijau';
        v_reason := 'Skor refleksi stabil.';
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

-- Backfill active risk level from each student's latest checkin.
WITH latest AS (
    SELECT DISTINCT ON (student_id)
        id,
        student_id,
        checkin_date,
        total_score,
        q10_perlukan_bantuan
    FROM public.checkins
    ORDER BY student_id, checkin_date DESC, created_at DESC
), deactivated AS (
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
        WHEN l.q10_perlukan_bantuan = 'ya' OR COALESCE(l.total_score, 0) < 40 THEN 'merah'::risk_level
        WHEN l.q10_perlukan_bantuan = 'mungkin' OR COALESCE(l.total_score, 0) < 55 THEN 'jingga'::risk_level
        WHEN COALESCE(l.total_score, 0) < 70 THEN 'kuning'::risk_level
        ELSE 'hijau'::risk_level
    END AS level,
    CASE
        WHEN l.q10_perlukan_bantuan = 'ya' OR COALESCE(l.total_score, 0) < 40 THEN 'Skor refleksi sangat rendah atau murid menyatakan perlukan bantuan.'
        WHEN l.q10_perlukan_bantuan = 'mungkin' OR COALESCE(l.total_score, 0) < 55 THEN 'Skor refleksi rendah atau murid mungkin perlukan bantuan.'
        WHEN COALESCE(l.total_score, 0) < 70 THEN 'Skor refleksi sederhana rendah; perlu dipantau.'
        ELSE 'Skor refleksi stabil.'
    END AS reason,
    NOW(),
    TRUE
FROM latest l;
