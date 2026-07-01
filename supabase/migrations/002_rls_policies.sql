-- S.T.A.R KJo - Row Level Security Policies
-- Migration 002: RLS Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Helper function: get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is user a staff (teacher/counselor/admin)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
    SELECT role IN ('class_teacher', 'discipline_teacher', 'counselor', 'admin') 
    FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is user counselor or admin
CREATE OR REPLACE FUNCTION is_counselor_or_admin()
RETURNS BOOLEAN AS $$
    SELECT role IN ('counselor', 'admin') 
    FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get student's parent
CREATE OR REPLACE FUNCTION is_parent_of(student_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = student_uuid 
        AND parent_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is teacher of student's class
CREATE OR REPLACE FUNCTION is_class_teacher_of(student_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p1
        JOIN profiles p2 ON p1.class_name = p2.class_name
        WHERE p1.id = auth.uid() 
        AND p1.role = 'class_teacher'
        AND p2.id = student_uuid
        AND p2.role = 'student'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- POLICIES: profiles
-- ============================================

-- Everyone can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

-- Students can view other students in same class (for collaboration features future)
CREATE POLICY "Students can view classmates"
    ON profiles FOR SELECT
    USING (
        role = 'student' 
        AND class_name = (SELECT class_name FROM profiles WHERE id = auth.uid() AND role = 'student')
    );

-- Staff can view all profiles
CREATE POLICY "Staff can view all profiles"
    ON profiles FOR SELECT
    USING (is_staff());

-- Parents can view their children's profiles
CREATE POLICY "Parents can view children profiles"
    ON profiles FOR SELECT
    USING (
        role = 'student' 
        AND parent_id = auth.uid()
    );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Only admin can insert/delete profiles
CREATE POLICY "Admin can manage profiles"
    ON profiles FOR ALL
    USING (get_user_role() = 'admin');

-- ============================================
-- POLICIES: checkins
-- ============================================

-- Students can insert their own checkins
CREATE POLICY "Students can create own checkins"
    ON checkins FOR INSERT
    WITH CHECK (student_id = auth.uid() AND get_user_role() = 'student');

-- Students can view their own checkins
CREATE POLICY "Students can view own checkins"
    ON checkins FOR SELECT
    USING (student_id = auth.uid());

-- Staff can view all checkins
CREATE POLICY "Staff can view all checkins"
    ON checkins FOR SELECT
    USING (is_staff());

-- Parents can view their children's checkins
CREATE POLICY "Parents can view children checkins"
    ON checkins FOR SELECT
    USING (is_parent_of(student_id));

-- ============================================
-- POLICIES: weekly_scores
-- ============================================

-- Students can view their own scores
CREATE POLICY "Students can view own scores"
    ON weekly_scores FOR SELECT
    USING (student_id = auth.uid());

-- Staff can view all scores
CREATE POLICY "Staff can view all scores"
    ON weekly_scores FOR SELECT
    USING (is_staff());

-- Parents can view children scores
CREATE POLICY "Parents can view children scores"
    ON weekly_scores FOR SELECT
    USING (is_parent_of(student_id));

-- System/Admin can insert/update (via cron job)
CREATE POLICY "Admin can manage scores"
    ON weekly_scores FOR ALL
    USING (get_user_role() = 'admin');

-- ============================================
-- POLICIES: risk_levels
-- ============================================

-- Only counselor/admin can view risk levels (sensitive)
CREATE POLICY "Counselor can view all risk levels"
    ON risk_levels FOR SELECT
    USING (is_counselor_or_admin());

-- Only counselor/admin can manage risk levels
CREATE POLICY "Counselor can manage risk levels"
    ON risk_levels FOR ALL
    USING (is_counselor_or_admin());

-- ============================================
-- POLICIES: behavior_records
-- ============================================

-- Students can view their own records
CREATE POLICY "Students can view own behavior records"
    ON behavior_records FOR SELECT
    USING (student_id = auth.uid());

-- Staff can view all records
CREATE POLICY "Staff can view all behavior records"
    ON behavior_records FOR SELECT
    USING (is_staff());

-- Teachers can insert records for students in their class
CREATE POLICY "Teachers can add behavior records"
    ON behavior_records FOR INSERT
    WITH CHECK (
        is_staff() 
        AND (
            is_class_teacher_of(student_id) 
            OR get_user_role() IN ('discipline_teacher', 'counselor', 'admin')
        )
    );

-- Parents can view children's records (limited: exclude teacher_note internal comments)
CREATE POLICY "Parents can view children behavior records"
    ON behavior_records FOR SELECT
    USING (
        is_parent_of(student_id) 
        AND record_type != 'teacher_note' -- hide internal teacher notes from parents
    );

-- ============================================
-- POLICIES: intervention_records
-- ============================================

-- Only counselor/admin can view/manage intervention records (highly sensitive)
CREATE POLICY "Counselor can view intervention records"
    ON intervention_records FOR SELECT
    USING (is_counselor_or_admin());

CREATE POLICY "Counselor can manage intervention records"
    ON intervention_records FOR ALL
    USING (is_counselor_or_admin());

-- ============================================
-- POLICIES: counseling_sessions
-- ============================================

-- Students can view their own sessions
CREATE POLICY "Students can view own sessions"
    ON counseling_sessions FOR SELECT
    USING (student_id = auth.uid());

-- Students can request sessions (insert)
CREATE POLICY "Students can request sessions"
    ON counseling_sessions FOR INSERT
    WITH CHECK (student_id = auth.uid() AND get_user_role() = 'student');

-- Counselor/admin can view all sessions
CREATE POLICY "Counselor can view all sessions"
    ON counseling_sessions FOR SELECT
    USING (is_counselor_or_admin());

-- Counselor/admin can manage sessions
CREATE POLICY "Counselor can manage sessions"
    ON counseling_sessions FOR ALL
    USING (is_counselor_or_admin());

-- Parents can view children's sessions (basic info only)
CREATE POLICY "Parents can view children sessions"
    ON counseling_sessions FOR SELECT
    USING (is_parent_of(student_id));

-- ============================================
-- POLICIES: badges & student_badges
-- ============================================

-- Everyone can view badges (public)
CREATE POLICY "Everyone can view badges"
    ON badges FOR SELECT
    USING (true);

-- Students can view their own earned badges
CREATE POLICY "Students can view own badges"
    ON student_badges FOR SELECT
    USING (student_id = auth.uid());

-- Staff can view all student badges
CREATE POLICY "Staff can view all student badges"
    ON student_badges FOR SELECT
    USING (is_staff());

-- Only system (admin) can award badges
CREATE POLICY "Admin can manage student badges"
    ON student_badges FOR ALL
    USING (get_user_role() = 'admin');

-- ============================================
-- POLICIES: points_tracker
-- ============================================

-- Students can view their own points
CREATE POLICY "Students can view own points"
    ON points_tracker FOR SELECT
    USING (student_id = auth.uid());

-- Staff can view all points
CREATE POLICY "Staff can view all points"
    ON points_tracker FOR SELECT
    USING (is_staff());

-- Parents can view children points
CREATE POLICY "Parents can view children points"
    ON points_tracker FOR SELECT
    USING (is_parent_of(student_id));

-- System updates points (via triggers)
CREATE POLICY "System can manage points"
    ON points_tracker FOR ALL
    USING (true); -- handled by trigger, not user-facing

-- ============================================
-- POLICIES: notifications
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can mark notifications as read
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true); -- via backend API/trigger

-- ============================================
-- POLICIES: audit_logs
-- ============================================

-- Only admin can view audit logs
CREATE POLICY "Admin can view audit logs"
    ON audit_logs FOR SELECT
    USING (get_user_role() = 'admin');

-- System can insert audit logs
CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true); -- via backend API

-- ============================================
-- POLICIES: ai_recommendations
-- ============================================

-- Only counselor/admin can view AI recommendations
CREATE POLICY "Counselor can view AI recommendations"
    ON ai_recommendations FOR SELECT
    USING (is_counselor_or_admin());

-- System can create recommendations
CREATE POLICY "System can create AI recommendations"
    ON ai_recommendations FOR INSERT
    WITH CHECK (true); -- via backend API (Fasa 5)

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments
COMMENT ON FUNCTION get_user_role IS 'Helper: dapatkan role user semasa';
COMMENT ON FUNCTION is_staff IS 'Helper: check sama ada user adalah staff (guru/GBK/admin)';
COMMENT ON FUNCTION is_counselor_or_admin IS 'Helper: check sama ada user adalah GBK atau admin';
COMMENT ON FUNCTION is_parent_of IS 'Helper: check sama ada user adalah ibu bapa kepada student tertentu';
COMMENT ON FUNCTION is_class_teacher_of IS 'Helper: check sama ada user adalah guru kelas kepada student tertentu';
