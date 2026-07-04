-- 015_parent_link_child_by_ic.sql
-- Ibu bapa paut anak sendiri dengan No. Kad Pengenalan (tanpa pentadbir)

CREATE OR REPLACE FUNCTION public.normalize_ic(p_ic TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_ic, ''), '[^0-9]', '', 'g'), '');
$$;

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
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sila log masuk.');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya akaun ibu bapa boleh paut anak.');
  END IF;

  v_norm := normalize_ic(child_ic);
  IF v_norm IS NULL OR length(v_norm) <> 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No. IC mesti 12 digit.');
  END IF;

  SELECT id, full_name, class_name, parent_id, ic_number
  INTO v_child
  FROM profiles
  WHERE role = 'student'
    AND normalize_ic(ic_number) = v_norm
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Murid dengan IC ini tidak dijumpai dalam sistem.');
  END IF;

  IF v_child.parent_id IS NOT NULL AND v_child.parent_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Murid ini sudah dipautkan kepada akaun ibu bapa lain.');
  END IF;

  IF v_child.parent_id = v_uid THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_linked', true,
      'child_id', v_child.id,
      'full_name', v_child.full_name,
      'class_name', v_child.class_name
    );
  END IF;

  UPDATE profiles
  SET parent_id = v_uid
  WHERE id = v_child.id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_linked', false,
    'child_id', v_child.id,
    'full_name', v_child.full_name,
    'class_name', v_child.class_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_child_to_parent_by_ic(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_child_to_parent_by_ic(TEXT) TO authenticated;

COMMENT ON FUNCTION public.link_child_to_parent_by_ic IS 'Ibu bapa: paut profil murid (role student) menggunakan No. IC 12 digit';