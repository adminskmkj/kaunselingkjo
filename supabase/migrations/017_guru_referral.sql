-- 017_guru_referral.sql
-- Guru / disiplin boleh rujuk murid ke GBK melalui Reach Out inbox.

-- 1) Tambah source 'guru' ke enum
ALTER TYPE public.reach_out_source ADD VALUE IF NOT EXISTS 'guru';

-- 2) Guru kelas / disiplin / admin boleh hantar rujukan untuk murid dalam kelas mereka
DROP POLICY IF EXISTS "Teachers send referral to GBK" ON public.reach_out_messages;
CREATE POLICY "Teachers send referral to GBK"
    ON public.reach_out_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND get_user_role() IN ('class_teacher', 'discipline_teacher', 'admin')
        AND source = 'guru'
    );

-- 3) Bila guru rujuk, auto-tetap counselor_id = kaunselor pertama (jika ada) supaya
--    inbox GBK papar "ditugaskan". Jika tiada kaunselor, biar NULL (GBK assign manual).
CREATE OR REPLACE FUNCTION public.assign_counselor_on_guru_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    cid UUID;
BEGIN
    IF NEW.source = 'guru' AND NEW.counselor_id IS NULL THEN
        SELECT id INTO cid FROM public.profiles
        WHERE role = 'counselor' LIMIT 1;
        NEW.counselor_id := cid;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reach_out_guru_counselor ON public.reach_out_messages;
CREATE TRIGGER reach_out_guru_counselor
    BEFORE INSERT ON public.reach_out_messages
    FOR EACH ROW EXECUTE FUNCTION public.assign_counselor_on_guru_referral();
