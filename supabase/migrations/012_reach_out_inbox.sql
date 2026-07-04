-- 012_reach_out_inbox.sql
-- Inbox GBK: mesej murid/ibu bapa + auto dari refleksi (q10 ya/mungkin)

CREATE TYPE reach_out_source AS ENUM ('murid', 'ibu_bapa', 'refleksi');
CREATE TYPE reach_out_status AS ENUM ('baru', 'dibaca', 'dijawab', 'ditutup');

CREATE TABLE public.reach_out_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    source reach_out_source NOT NULL DEFAULT 'murid',
    status reach_out_status NOT NULL DEFAULT 'baru',
    checkin_id UUID REFERENCES public.checkins(id) ON DELETE SET NULL,
    counselor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reply_message TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_reach_out_one_per_checkin
    ON public.reach_out_messages(checkin_id);

CREATE INDEX idx_reach_out_student_created ON public.reach_out_messages(student_id, created_at DESC);
CREATE INDEX idx_reach_out_status_created ON public.reach_out_messages(status, created_at DESC);

CREATE TRIGGER reach_out_messages_updated_at
    BEFORE UPDATE ON public.reach_out_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto ticket dari refleksi
CREATE OR REPLACE FUNCTION public.sync_reach_out_from_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    msg TEXT;
BEGIN
    IF NEW.q10_perlukan_bantuan NOT IN ('ya', 'mungkin') THEN
        RETURN NEW;
    END IF;

    msg := format(
        'Refleksi %s: perasaan %s, stres %s/3, perlukan bantuan = %s.',
        NEW.checkin_date,
        COALESCE(NEW.q7_perasaan_emosi::text, '-'),
        COALESCE(NEW.q9_tahap_stres::text, '-'),
        NEW.q10_perlukan_bantuan
    );

    INSERT INTO public.reach_out_messages (student_id, sender_id, message, source, checkin_id, status)
    VALUES (NEW.student_id, NEW.student_id, msg, 'refleksi', NEW.id, 'baru')
    ON CONFLICT (checkin_id) DO UPDATE SET
        message = EXCLUDED.message,
        status = CASE
            WHEN reach_out_messages.status IN ('ditutup') THEN reach_out_messages.status
            ELSE 'baru'
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS checkins_sync_reach_out ON public.checkins;
CREATE TRIGGER checkins_sync_reach_out
    AFTER INSERT OR UPDATE OF q10_perlukan_bantuan, q7_perasaan_emosi, q9_tahap_stres ON public.checkins
    FOR EACH ROW EXECUTE FUNCTION public.sync_reach_out_from_checkin();

ALTER TABLE public.reach_out_messages ENABLE ROW LEVEL SECURITY;

-- Murid: hantar & baca mesej sendiri
CREATE POLICY "Students view own reach out"
    ON public.reach_out_messages FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Students send reach out"
    ON public.reach_out_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND student_id = auth.uid()
        AND source = 'murid'
        AND get_user_role() = 'student'
    );

-- Ibu bapa: hantar untuk anak
CREATE POLICY "Parents view child reach out"
    ON public.reach_out_messages FOR SELECT
    USING (is_parent_of(student_id));

CREATE POLICY "Parents send reach out for child"
    ON public.reach_out_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND is_parent_of(student_id)
        AND source = 'ibu_bapa'
        AND get_user_role() = 'parent'
    );

-- GBK / admin
CREATE POLICY "Counselor view all reach out"
    ON public.reach_out_messages FOR SELECT
    USING (is_counselor_or_admin());

CREATE POLICY "Counselor manage reach out"
    ON public.reach_out_messages FOR UPDATE
    USING (is_counselor_or_admin());

-- Backfill dari checkin sedia ada (q10 ya/mungkin)
INSERT INTO public.reach_out_messages (student_id, sender_id, message, source, checkin_id, status)
SELECT
    c.student_id,
    c.student_id,
    format(
        'Refleksi %s: perasaan %s, stres %s/3, perlukan bantuan = %s.',
        c.checkin_date,
        COALESCE(c.q7_perasaan_emosi::text, '-'),
        COALESCE(c.q9_tahap_stres::text, '-'),
        c.q10_perlukan_bantuan
    ),
    'refleksi'::reach_out_source,
    c.id,
    'baru'::reach_out_status
FROM public.checkins c
WHERE c.q10_perlukan_bantuan IN ('ya', 'mungkin')
ON CONFLICT (checkin_id) DO NOTHING;

COMMENT ON TABLE public.reach_out_messages IS 'Reach Out inbox GBK — mesej murid/ibu bapa + auto refleksi';