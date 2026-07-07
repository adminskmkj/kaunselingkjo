-- 020_fix_link_child_use_ic_number.sql
--
-- FIX BUG: RPC link_child_to_parent_by_ic() (019) cari murid guna
--   normalize_ic(ic_or_student_id) = v_norm
-- tapi ic_or_student_id simpan 6 digit akhir IC (untuk murid),
-- BUKAN IC penuh 12 digit. normalize_ic(6 digit) takkan padan dengan
-- IC 12 digit yang dimasukkan ibu bapa.
--
-- FIX: cari murid guna column ic_number (migration 017) yang simpan
-- IC penuh. ic_or_student_id kekal untuk backwards-compat display.
--
-- Juga tambah fallback: jika ic_number NULL, cuba padan 6 digit akhir
-- ic_or_student_id dengan 6 digit akhir IC yang dimasukkan.

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
  v_norm_tail TEXT;
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

  -- 6 digit akhir untuk fallback carian ic_or_student_id
  v_norm_tail := right(v_norm, 6);

  -- Cari murid: utama guna ic_number (IC penuh), fallback ic_or_student_id (6 digit)
  SELECT id, full_name, class_name, parent_id
  INTO v_child
  FROM profiles
  WHERE role = 'student'
    AND (
      normalize_ic(ic_number) = v_norm
      OR normalize_ic(ic_or_student_id) = v_norm
      OR ic_or_student_id = v_norm_tail
    )
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
