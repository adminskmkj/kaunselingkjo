-- 009_rls_hardening.sql
-- Align RLS with Plan v3 Role Access Matrix and remove overly-permissive user-facing policies.

-- 1) Students should NOT view classmates until a safe SECURITY DEFINER feature is explicitly rebuilt.
DROP POLICY IF EXISTS "Students can view classmates" ON public.profiles;

-- 2) points_tracker is updated by trigger only. Make trigger SECURITY DEFINER, then block direct user writes.
CREATE OR REPLACE FUNCTION public.update_student_streak()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.points_tracker (student_id, last_checkin_date, current_streak, longest_streak)
    VALUES (NEW.student_id, NEW.checkin_date, 1, 1)
    ON CONFLICT (student_id) DO UPDATE SET
        current_streak = CASE
            WHEN public.points_tracker.last_checkin_date = NEW.checkin_date - INTERVAL '1 day'
                THEN public.points_tracker.current_streak + 1
            WHEN public.points_tracker.last_checkin_date = NEW.checkin_date
                THEN public.points_tracker.current_streak
            ELSE 1
        END,
        longest_streak = GREATEST(
            public.points_tracker.longest_streak,
            CASE
                WHEN public.points_tracker.last_checkin_date = NEW.checkin_date - INTERVAL '1 day'
                    THEN public.points_tracker.current_streak + 1
                WHEN public.points_tracker.last_checkin_date = NEW.checkin_date
                    THEN public.points_tracker.current_streak
                ELSE 1
            END
        ),
        last_checkin_date = GREATEST(public.points_tracker.last_checkin_date, NEW.checkin_date),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "System can manage points" ON public.points_tracker;
CREATE POLICY "System can manage points"
    ON public.points_tracker FOR ALL
    USING (FALSE)
    WITH CHECK (FALSE);

-- 3) Backend/system writes should use service_role. Authenticated users should not insert arbitrary notifications/audit/AI rows.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admin can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
CREATE POLICY "Admin can create audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can create AI recommendations" ON public.ai_recommendations;
CREATE POLICY "Admin can create AI recommendations"
    ON public.ai_recommendations FOR INSERT
    WITH CHECK (public.get_user_role() = 'admin');
