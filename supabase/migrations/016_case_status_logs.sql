-- 016_case_status_logs.sql
-- Log perubahan status kes + tarikh susulan + RPC berwajib field

ALTER TABLE public.intervention_records
  ADD COLUMN IF NOT EXISTS tarikh_susulan DATE,
  ADD COLUMN IF NOT EXISTS overdue_alerted BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.case_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.intervention_records(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES public.profiles(id),
  from_status public.case_status,
  to_status public.case_status NOT NULL,
  nota TEXT,
  tarikh_susulan DATE,
  agensi_rujukan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_status_logs_case ON public.case_status_logs(case_id, created_at DESC);

ALTER TABLE public.case_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Counselor can view case status logs" ON public.case_status_logs;
CREATE POLICY "Counselor can view case status logs"
  ON public.case_status_logs FOR SELECT
  USING (public.is_counselor_or_admin());

DROP POLICY IF EXISTS "Counselor can insert case status logs" ON public.case_status_logs;
CREATE POLICY "Counselor can insert case status logs"
  ON public.case_status_logs FOR INSERT
  WITH CHECK (public.is_counselor_or_admin());

CREATE OR REPLACE FUNCTION public.change_case_status(
  p_case_id UUID,
  p_to_status public.case_status,
  p_nota TEXT DEFAULT NULL,
  p_tarikh_susulan DATE DEFAULT NULL,
  p_agensi_rujukan TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.intervention_records%ROWTYPE;
  v_uid UUID := auth.uid();
  v_nota_trim TEXT;
BEGIN
  IF NOT public.is_counselor_or_admin() THEN
    RAISE EXCEPTION 'Hanya GBK/pentadbir';
  END IF;

  SELECT * INTO v_row FROM public.intervention_records WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kes tidak dijumpai';
  END IF;

  IF v_row.case_status = p_to_status THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;

  v_nota_trim := NULLIF(TRIM(COALESCE(p_nota, '')), '');

  IF p_to_status = 'dalam_tindakan' AND p_tarikh_susulan IS NULL THEN
    RAISE EXCEPTION 'Tarikh sesi seterusnya wajib untuk Dalam Tindakan';
  END IF;

  IF p_to_status = 'susulan' THEN
    IF v_nota_trim IS NULL THEN
      RAISE EXCEPTION 'Nota susulan wajib';
    END IF;
    IF p_tarikh_susulan IS NULL THEN
      RAISE EXCEPTION 'Tarikh susulan wajib';
    END IF;
  END IF;

  IF p_to_status = 'selesai' THEN
    IF v_nota_trim IS NULL OR LENGTH(v_nota_trim) < 20 THEN
      RAISE EXCEPTION 'Ringkasan penutup wajib (min 20 aksara)';
    END IF;
  END IF;

  IF p_to_status = 'rujuk_luar' THEN
    IF NULLIF(TRIM(COALESCE(p_agensi_rujukan, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Nama agensi/pihak rujukan wajib';
    END IF;
    IF p_tarikh_susulan IS NULL THEN
      RAISE EXCEPTION 'Tarikh rujuk wajib';
    END IF;
  END IF;

  INSERT INTO public.case_status_logs (
    case_id, counselor_id, from_status, to_status, nota, tarikh_susulan, agensi_rujukan
  ) VALUES (
    p_case_id, v_uid, v_row.case_status, p_to_status, v_nota_trim, p_tarikh_susulan,
    NULLIF(TRIM(COALESCE(p_agensi_rujukan, '')), '')
  );

  UPDATE public.intervention_records
  SET
    case_status = p_to_status,
    tarikh_susulan = CASE
      WHEN p_to_status IN ('dalam_tindakan', 'susulan', 'rujuk_luar') THEN p_tarikh_susulan
      ELSE tarikh_susulan
    END,
    referral_to = CASE
      WHEN p_to_status = 'rujuk_luar' THEN NULLIF(TRIM(COALESCE(p_agensi_rujukan, '')), '')
      ELSE referral_to
    END,
    summary = CASE
      WHEN p_to_status = 'selesai' AND v_nota_trim IS NOT NULL THEN
        COALESCE(summary, '') || E'\n\n[Penutup] ' || v_nota_trim
      ELSE summary
    END,
    overdue_alerted = FALSE,
    updated_at = NOW()
  WHERE id = p_case_id;

  RETURN jsonb_build_object('ok', true, 'to_status', p_to_status::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_case_status(UUID, public.case_status, TEXT, DATE, TEXT) TO authenticated;

COMMENT ON TABLE public.case_status_logs IS 'Timeline perubahan status kes GBK';