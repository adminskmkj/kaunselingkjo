-- 021_debug_link_child_verbose.sql
--
-- DEBUG sahaja: bagi mesej ralat spesifik supaya tahu puncanya.
-- JANGAN guna lama-lama (sebab dedah sama ada IC wujud/tak). Buang bila dah siap.
-- Run 020 dulu, kemudian run ni untuk overwrite RPC.

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
  v_g1 TEXT;
  v_g2 TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sila log masuk.');
  END IF;

  SELECT role, ic_number INTO v_role, v_parent_ic FROM profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya akaun ibu bapa. role=' || COALESCE(v_role::text,'NULL'));
  END IF;

  v_parent_ic := normalize_ic(v_parent_ic);
  IF v_parent_ic IS NULL OR length(v_parent_ic) <> 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'IC ibu bapa tak valid/kosong. kena isi dulu.');
  END IF;

  v_norm := normalize_ic(child_ic);
  IF v_norm IS NULL OR length(v_norm) <> 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'IC anak mesti 12 digit.');
  END IF;

  v_norm_tail := right(v_norm, 6);

  SELECT id, full_name, class_name, parent_id, ic_number, ic_or_student_id
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
    RETURN jsonb_build_object('ok', false, 'error',
      'Murid tak dijumpai. IC dicari: ' || v_norm ||
      ' | tail6: ' || v_norm_tail ||
      ' | hint: semak ic_number & ic_or_student_id murid dalam DB');
  END IF;

  SELECT guardian1_ic, guardian2_ic INTO v_guardian
  FROM public.kpm_guardian_registry
  WHERE student_ic = v_norm;

  v_g1 := COALESCE(normalize_ic(v_guardian.guardian1_ic), 'NULL');
  v_g2 := COALESCE(normalize_ic(v_guardian.guardian2_ic), 'NULL');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'kpm_guardian_registry KOSONG untuk student_ic=' || v_norm ||
      ' | kena import fail KPM dulu untuk murid ni');
  END IF;

  IF v_parent_ic IS DISTINCT FROM normalize_ic(v_guardian.guardian1_ic)
     AND v_parent_ic IS DISTINCT FROM normalize_ic(v_guardian.guardian2_ic) THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'IC ibu bapa (' || v_parent_ic || ') tak padan guardian1 (' || v_g1 || ') atau guardian2 (' || v_g2 || ')');
  END IF;

  IF v_child.parent_id IS NOT NULL AND v_child.parent_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Murid dah dipaut ke akaun lain.');
  END IF;

  IF v_child.parent_id = v_uid THEN
    RETURN jsonb_build_object('ok', true, 'already_linked', true,
      'child_id', v_child.id, 'full_name', v_child.full_name, 'class_name', v_child.class_name);
  END IF;

  UPDATE profiles SET parent_id = v_uid WHERE id = v_child.id;

  RETURN jsonb_build_object('ok', true, 'already_linked', false,
    'child_id', v_child.id, 'full_name', v_child.full_name, 'class_name', v_child.class_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_child_to_parent_by_ic(TEXT) TO authenticated;
