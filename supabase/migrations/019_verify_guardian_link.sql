-- 019_verify_guardian_link.sql
--
-- FIX KRITIKAL: link_child_to_parent_by_ic() (015) sebelum ni hanya semak
-- No. IC MURID — sesiapa yang tahu/teka IC seorang murid boleh paut akaun
-- "ibu bapa" kepada murid tersebut dan nampak data kehadiran/tingkah
-- laku/nota kaunseling yang dikongsi. No. IC bukan rahsia (boleh didapati
-- dari kawan sekelas, dokumen sekolah, dll), jadi ia TIDAK boleh jadi
-- satu-satunya kunci pengesahan.
--
-- FIX: Selepas jumpa murid ikut No. IC yang dimasukkan, fungsi ni SEKARANG
-- WAJIB semak No. IC akaun ibu bapa yang login (profiles.ic_number) PADAN
-- dengan salah satu "Penjaga 1" / "Penjaga 2" berdaftar rasmi di KPM untuk
-- murid tersebut (public.kpm_guardian_registry — lihat 018).
--
-- Jika akaun ibu bapa belum isi ic_number sendiri, ATAU IC dia tidak padan
-- dengan mana-mana penjaga berdaftar, ATAU murid tiada rekod KPM lagi
-- (contoh data belum diimport) — pautan DITOLAK (fail-closed, bukan
-- fail-open) dan diarah untuk hubungi GBK/admin untuk pautan manual.

CREATE OR REPLACE FUNCTION public.link_child_to_parent_by_ic(child_ic TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role user_role;
  v_norm TEXT;
  v_child RECORD;
  v_parent_ic TEXT;
  v_guardian RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sila log masuk.');
  END IF;

  SELECT role, ic_number INTO v_role, v_parent_ic FROM profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya akaun ibu bapa boleh paut anak.');
  END IF;

  v_parent_ic := normalize_ic(v_parent_ic);
  IF v_parent_ic IS NULL OR length(v_parent_ic) <> 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sila lengkapkan No. IC akaun anda sendiri (dalam profil) sebelum memaut anak.');
  END IF;

  v_norm := normalize_ic(child_ic);
  IF v_norm IS NULL OR length(v_norm) <> 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No. IC mesti 12 digit.');
  END IF;

  -- Jangan bezakan mesej ralat antara "murid tak wujud" vs "penjaga tak sepadan"
  -- supaya tak boleh diguna untuk enumerate No. IC murid yang sah.
  SELECT id, full_name, class_name, parent_id
  INTO v_child
  FROM profiles
  WHERE role = 'student'
    AND normalize_ic(ic_or_student_id) = v_norm
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pautan gagal. Sila semak No. IC atau hubungi GBK/admin sekolah.');
  END IF;

  SELECT guardian1_ic, guardian2_ic INTO v_guardian
  FROM public.kpm_guardian_registry
  WHERE student_ic = v_norm;

  IF NOT FOUND
     OR (v_parent_ic IS DISTINCT FROM v_guardian.guardian1_ic
         AND v_parent_ic IS DISTINCT FROM v_guardian.guardian2_ic) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pautan gagal. Sila semak No. IC atau hubungi GBK/admin sekolah.');
  END IF;

  IF v_child.parent_id IS NOT NULL AND v_child.parent_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Murid ini sudah dipautkan kepada akaun ibu bapa lain. Hubungi GBK/admin jika ini silap.');
  END IF;

  IF v_child.parent_id = v_uid THEN
    RETURN jsonb_build_object(
      'ok', true, 'already_linked', true,
      'child_id', v_child.id, 'full_name', v_child.full_name, 'class_name', v_child.class_name
    );
  END IF;

  UPDATE profiles SET parent_id = v_uid WHERE id = v_child.id;

  RETURN jsonb_build_object(
    'ok', true, 'already_linked', false,
    'child_id', v_child.id, 'full_name', v_child.full_name, 'class_name', v_child.class_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_child_to_parent_by_ic(TEXT) TO authenticated;
