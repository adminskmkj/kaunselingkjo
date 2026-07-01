-- S.T.A.R KJo - Database Schema
-- Migration 001: Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM ('student', 'class_teacher', 'discipline_teacher', 'counselor', 'admin', 'parent');
CREATE TYPE risk_level AS ENUM ('hijau', 'kuning', 'jingga', 'merah');
CREATE TYPE record_type AS ENUM ('attendance', 'discipline_case', 'merit', 'cocurricular', 'teacher_note', 'self_reflection');
CREATE TYPE case_status AS ENUM ('baru', 'dalam_tindakan', 'selesai', 'rujuk_luar');
CREATE TYPE session_status AS ENUM ('pending', 'disahkan', 'selesai', 'dibatalkan');
CREATE TYPE notification_type AS ENUM ('reminder_checkin', 'reminder_session', 'alert_no_checkin', 'motivational_message', 'alert_risk_change');
CREATE TYPE emotion_type AS ENUM ('gembira', 'sedih', 'tertekan', 'biasa');
CREATE TYPE need_help AS ENUM ('ya', 'tidak', 'mungkin');

-- 1. profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    class_name TEXT, -- untuk student/class_teacher
    ic_or_student_id TEXT UNIQUE, -- 6 digit akhir IC untuk student
    avatar_url TEXT,
    parent_id UUID REFERENCES profiles(id), -- link student → parent
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. checkins (refleksi harian murid - 10 soalan)
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Bahagian A: Disiplin & Tanggungjawab (1-3)
    q1_kehadiran_ketepatan SMALLINT CHECK (q1_kehadiran_ketepatan BETWEEN 1 AND 3),
    q2_pematuhan_peraturan SMALLINT CHECK (q2_pematuhan_peraturan BETWEEN 1 AND 3),
    q3_penyiapan_tugasan SMALLINT CHECK (q3_penyiapan_tugasan BETWEEN 1 AND 3),
    q4_kebersihan SMALLINT CHECK (q4_kebersihan BETWEEN 1 AND 3),
    q5_komunikasi_sopan SMALLINT CHECK (q5_komunikasi_sopan BETWEEN 1 AND 3),
    
    -- Bahagian B: Emosi & Kesejahteraan
    q6_motivasi_belajar SMALLINT CHECK (q6_motivasi_belajar BETWEEN 1 AND 3),
    q7_perasaan_emosi emotion_type,
    q8_hubungan_rakan SMALLINT CHECK (q8_hubungan_rakan BETWEEN 1 AND 3), -- 1=konflik, 2=neutral, 3=harmoni
    q9_tahap_stres SMALLINT CHECK (q9_tahap_stres BETWEEN 1 AND 3), -- 1=tinggi, 2=sederhana, 3=rendah
    q10_perlukan_bantuan need_help,
    
    -- Auto-calculated
    total_score NUMERIC(5,2), -- 0-100%
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, checkin_date) -- satu refleksi per hari
);

-- 3. weekly_scores (agregat untuk dashboard)
CREATE TABLE weekly_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    avg_score NUMERIC(5,2),
    status TEXT, -- cemerlang / baik / sederhana / perlu_bimbingan
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, week_start_date)
);

-- 4. risk_levels (sistem amaran awal)
CREATE TABLE risk_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level risk_level NOT NULL,
    reason TEXT, -- auto-generated atau manual override
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. behavior_records (pelbagai sumber data)
CREATE TABLE behavior_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    record_type record_type NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0, -- +merit, -discipline_case
    recorded_by UUID REFERENCES profiles(id), -- guru yang key in
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. intervention_records (rekod tindakan GBK)
CREATE TABLE intervention_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES profiles(id),
    session_date DATE NOT NULL,
    intervention_type TEXT, -- contoh: "kaunseling individu", "bimbingan kumpulan"
    objective TEXT,
    summary TEXT,
    follow_up_action TEXT,
    case_status case_status DEFAULT 'baru',
    referral_to TEXT, -- "ibu bapa", "agensi luar", "pakar"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. counseling_sessions (tempahan sesi)
CREATE TABLE counseling_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    counselor_id UUID REFERENCES profiles(id),
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    purpose TEXT,
    status session_status DEFAULT 'pending',
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. badges (lencana gamifikasi)
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    criteria TEXT -- contoh: "score >= 90 for 4 weeks"
);

-- 9. student_badges (many-to-many)
CREATE TABLE student_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, badge_id)
);

-- 10. points_tracker (untuk gamifikasi - track total points)
CREATE TABLE points_tracker (
    student_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0, -- streak harian checkin
    longest_streak INTEGER DEFAULT 0,
    last_checkin_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. notifications (peringatan automatik)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. audit_logs (privasi & keselamatan)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL, -- 'view_student_data', 'edit_record', 'export_report'
    target_student_id UUID REFERENCES profiles(id),
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ai_recommendations (Fasa 5)
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommendation_text TEXT NOT NULL,
    priority_rank INTEGER, -- 1=urgent, 2=medium, 3=low
    based_on TEXT, -- contoh: "trend kehadiran + catatan guru"
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_checkins_student_date ON checkins(student_id, checkin_date DESC);
CREATE INDEX idx_behavior_records_student ON behavior_records(student_id, record_date DESC);
CREATE INDEX idx_risk_levels_active ON risk_levels(student_id, is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_risk_levels_one_active_per_student ON risk_levels(student_id) WHERE is_active = TRUE;
CREATE INDEX idx_intervention_records_student ON intervention_records(student_id, session_date DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Trigger untuk auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER intervention_records_updated_at BEFORE UPDATE ON intervention_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function untuk auto-calculate checkin total_score
CREATE OR REPLACE FUNCTION calculate_checkin_score()
RETURNS TRIGGER AS $$
DECLARE
    bahagian_a NUMERIC;
    bahagian_b NUMERIC;
    q7_score NUMERIC;
    q10_score NUMERIC;
BEGIN
    -- Bahagian A (5 soalan x 3 = 15 max)
    bahagian_a := COALESCE(NEW.q1_kehadiran_ketepatan, 0) +
                  COALESCE(NEW.q2_pematuhan_peraturan, 0) +
                  COALESCE(NEW.q3_penyiapan_tugasan, 0) +
                  COALESCE(NEW.q4_kebersihan, 0) +
                  COALESCE(NEW.q5_komunikasi_sopan, 0);
    
    -- Bahagian B (q6, q8, q9 = 9 max)
    bahagian_b := COALESCE(NEW.q6_motivasi_belajar, 0) +
                  COALESCE(NEW.q8_hubungan_rakan, 0) +
                  COALESCE(NEW.q9_tahap_stres, 0);
    
    -- q7: emosi (3=gembira, 2=biasa, 1=sedih/tertekan)
    q7_score := CASE NEW.q7_perasaan_emosi
        WHEN 'gembira' THEN 3
        WHEN 'biasa' THEN 2
        WHEN 'sedih' THEN 1
        WHEN 'tertekan' THEN 1
        ELSE 0
    END;
    
    -- q10: perlukan bantuan (3=tidak, 2=mungkin, 1=ya) -- inverted, sebab "tidak perlukan" = positif
    q10_score := CASE NEW.q10_perlukan_bantuan
        WHEN 'tidak' THEN 3
        WHEN 'mungkin' THEN 2
        WHEN 'ya' THEN 1
        ELSE 0
    END;
    
    -- Total: 30 max (15+9+3+3), convert to percentage
    NEW.total_score := ((bahagian_a + bahagian_b + q7_score + q10_score) / 30.0) * 100;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkins_calculate_score BEFORE INSERT OR UPDATE ON checkins
    FOR EACH ROW EXECUTE FUNCTION calculate_checkin_score();

-- Function untuk update streak bila murid checkin
CREATE OR REPLACE FUNCTION update_student_streak()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO points_tracker (student_id, last_checkin_date, current_streak, longest_streak)
    VALUES (NEW.student_id, NEW.checkin_date, 1, 1)
    ON CONFLICT (student_id) DO UPDATE SET
        current_streak = CASE
            WHEN points_tracker.last_checkin_date = NEW.checkin_date - INTERVAL '1 day' THEN points_tracker.current_streak + 1
            ELSE 1
        END,
        longest_streak = GREATEST(points_tracker.longest_streak, 
            CASE
                WHEN points_tracker.last_checkin_date = NEW.checkin_date - INTERVAL '1 day' THEN points_tracker.current_streak + 1
                ELSE 1
            END),
        last_checkin_date = NEW.checkin_date,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkins_update_streak AFTER INSERT ON checkins
    FOR EACH ROW EXECUTE FUNCTION update_student_streak();

-- Comments untuk dokumentasi
COMMENT ON TABLE profiles IS 'Semua pengguna (murid, guru, GBK, ibu bapa, pentadbir)';
COMMENT ON TABLE checkins IS 'Refleksi harian murid (10 soalan)';
COMMENT ON TABLE risk_levels IS 'Sistem amaran awal (hijau/kuning/jingga/merah)';
COMMENT ON TABLE behavior_records IS 'Rekod pelbagai sumber: kehadiran, merit, kes disiplin, catatan guru';
COMMENT ON TABLE intervention_records IS 'Rekod tindakan GBK (case management)';
COMMENT ON TABLE audit_logs IS 'Audit trail untuk privasi & keselamatan';
