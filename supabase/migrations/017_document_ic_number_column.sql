-- 017_document_ic_number_column.sql
--
-- SCHEMA DRIFT DITEMUI: `profiles.ic_number` digunakan dalam
-- 015_parent_link_child_by_ic.sql dan app/ibu-bapa/page.tsx, TAPI lajur ini
-- tidak pernah dicipta oleh mana-mana migration bertulis dalam repo ini.
-- Ini bermakna ia mesti telah ditambah terus melalui Supabase Studio UI (bukan
-- migration) — sebarang environment baru (staging/local/CLI `db push`) akan
-- GAGAL sebab lajur ni "tak wujud" pada schema bersih.
--
-- Migration ni dokumenkan secara rasmi lajur tersebut (IF NOT EXISTS, selamat
-- walaupun ia dah wujud secara manual di production).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ic_number TEXT;

COMMENT ON COLUMN public.profiles.ic_number IS
  'No. KP penuh (12 digit) akaun ibu bapa sendiri — diisi semasa daftar, digunakan untuk sahkan pautan anak (lihat 019_verify_guardian_link.sql)';

CREATE INDEX IF NOT EXISTS idx_profiles_ic_number ON public.profiles (ic_number) WHERE ic_number IS NOT NULL;
