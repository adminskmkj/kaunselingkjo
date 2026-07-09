-- 026_staff_view_risk_levels.sql
-- Guru kelas / disiplin perlu baca risk_levels (read-only) untuk dashboard /guru.
-- Hanya counselor/admin kekal boleh INSERT/UPDATE/DELETE.

DROP POLICY IF EXISTS "Staff can view risk levels" ON public.risk_levels;
CREATE POLICY "Staff can view risk levels"
    ON public.risk_levels FOR SELECT
    USING (public.is_staff());

COMMENT ON POLICY "Staff can view risk levels" ON public.risk_levels IS
  'Guru/GBK/admin boleh lihat tahap risiko aktif (read-only). Ubah risk kekal counselor/admin sahaja.';
