-- 018_kpm_guardian_registry.sql
--
-- Table rujukan penjaga rasmi daripada laporan KPM bulanan (JBA1010).
-- Digunakan untuk SAHKAN identiti ibu bapa semasa paut akaun ke anak
-- (bukan sekadar No. IC murid — lihat 019_verify_guardian_link.sql).
--
-- NOTA MINIMISASI DATA: hanya lajur yang PERLU untuk pengesahan identiti
-- disimpan (nama, IC, hubungan, telefon). Lajur sensitif dari fail KPM asal
-- (pendapatan, majikan, no. akaun bank, alamat penuh) TIDAK diimport ke
-- sistem ni sebab tidak diperlukan oleh aplikasi kaunseling ni.

CREATE TABLE IF NOT EXISTS public.kpm_guardian_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_kpm_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_ic TEXT NOT NULL,
    class_name TEXT,
    guardian1_name TEXT,
    guardian1_ic TEXT,
    guardian1_relationship TEXT,
    guardian1_phone TEXT,
    guardian2_name TEXT,
    guardian2_ic TEXT,
    guardian2_relationship TEXT,
    guardian2_phone TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_ic)
);

CREATE INDEX IF NOT EXISTS idx_kpm_guardian_student_ic ON public.kpm_guardian_registry (student_ic);
CREATE INDEX IF NOT EXISTS idx_kpm_guardian_g1_ic ON public.kpm_guardian_registry (guardian1_ic);
CREATE INDEX IF NOT EXISTS idx_kpm_guardian_g2_ic ON public.kpm_guardian_registry (guardian2_ic);

ALTER TABLE public.kpm_guardian_registry ENABLE ROW LEVEL SECURITY;

-- Hanya GBK/admin boleh baca/urus rujukan ni terus. Ibu bapa TIDAK pernah
-- diberi akses SELECT terus kepada table ni (ia hanya dirujuk secara dalaman
-- oleh RPC link_child_to_parent_by_ic melalui SECURITY DEFINER).
DROP POLICY IF EXISTS "Admin manage kpm guardian registry" ON public.kpm_guardian_registry;
CREATE POLICY "Admin manage kpm guardian registry"
    ON public.kpm_guardian_registry FOR ALL
    USING (is_counselor_or_admin())
    WITH CHECK (is_counselor_or_admin());

COMMENT ON TABLE public.kpm_guardian_registry IS
  'Rujukan penjaga rasmi dari laporan KPM JBA1010 bulanan. Guna untuk sahkan identiti ibu bapa semasa pautan akaun. Re-import (upsert ikut student_ic) setiap bulan bila fail KPM baru diterima.';
