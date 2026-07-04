-- 014_parent_intervention_visibility.sql
-- GBK boleh kongsi ringkasan selamat kepada ibu bapa

ALTER TABLE public.intervention_records
    ADD COLUMN IF NOT EXISTS parent_note TEXT,
    ADD COLUMN IF NOT EXISTS share_with_parent BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Parents can view shared intervention notes" ON public.intervention_records;
CREATE POLICY "Parents can view shared intervention notes"
    ON public.intervention_records FOR SELECT
    USING (is_parent_of(student_id) AND share_with_parent = true);

COMMENT ON COLUMN public.intervention_records.parent_note IS 'Mesej ringkas untuk ibu bapa (bukan nota dalaman penuh)';
COMMENT ON COLUMN public.intervention_records.share_with_parent IS 'Jika true, ibu bapa boleh baca parent_note sahaja';