-- 028_q22_tidak_yakin_reverse_score.sql
-- Soalan q22: "Saya berasa tidak yakin dengan diri saya hari ini."
-- Skor mesti REVERSE (tinggi setuju = kurang sihat), sama macam q19-q21.

COMMENT ON COLUMN public.checkins.q22_tekanan_yakin IS
  'Emosi C.4: Saya berasa tidak yakin dengan diri saya hari ini (1-5, REVERSE)';

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

    -- Semua Emosi C reverse (risau/takut/marah/tidak yakin)
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
