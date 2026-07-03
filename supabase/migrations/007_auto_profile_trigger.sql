-- 007_auto_profile_trigger.sql
-- Auto-create public.profiles row when Supabase Auth creates a user.
-- Requires scripts/API to pass raw_user_meta_data.role and related fields.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
    v_class_name TEXT;
    v_ic_or_student_id TEXT;
    v_must_change_password BOOLEAN;
BEGIN
    v_role := NULLIF(NEW.raw_user_meta_data->>'role', '');

    -- If role metadata is missing, do not guess. Keep repair/backfill scripts as safety net.
    IF v_role IS NULL THEN
        RETURN NEW;
    END IF;

    v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''));
    v_class_name := NULLIF(NEW.raw_user_meta_data->>'class_name', '');
    v_ic_or_student_id := NULLIF(NEW.raw_user_meta_data->>'ic_or_student_id', '');
    v_must_change_password := COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, FALSE);

    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        class_name,
        ic_or_student_id,
        must_change_password
    ) VALUES (
        NEW.id,
        v_role::user_role,
        v_full_name,
        v_class_name,
        v_ic_or_student_id,
        v_must_change_password
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
