-- 013_reach_out_unread_badges.sql
-- Badge murid: balasan GBK belum dibaca

ALTER TABLE public.reach_out_messages
    ADD COLUMN IF NOT EXISTS student_seen_reply BOOLEAN NOT NULL DEFAULT true;

UPDATE public.reach_out_messages
SET student_seen_reply = false
WHERE reply_message IS NOT NULL AND status = 'dijawab';

CREATE OR REPLACE FUNCTION public.reach_out_reply_notify_student()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.reply_message IS NOT NULL
       AND (OLD.reply_message IS NULL OR NEW.reply_message IS DISTINCT FROM OLD.reply_message) THEN
        NEW.student_seen_reply := false;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reach_out_reply_notify ON public.reach_out_messages;
CREATE TRIGGER reach_out_reply_notify
    BEFORE UPDATE ON public.reach_out_messages
    FOR EACH ROW EXECUTE FUNCTION public.reach_out_reply_notify_student();

-- Murid boleh tandakan balasan sebagai dibaca
CREATE POLICY "Students mark reach out reply seen"
    ON public.reach_out_messages FOR UPDATE
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());