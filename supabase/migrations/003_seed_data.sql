-- S.T.A.R KJo - Seed Data
-- Migration 003: Initial seed data for testing

-- Insert default badges
INSERT INTO badges (id, name, description, icon_url, criteria) VALUES
    ('00000000-0000-0000-0000-000000000001', 'First S.T.A.R', 'Lengkapkan refleksi pertama', '🌟', 'Lengkapkan 1 checkin'),
    ('00000000-0000-0000-0000-000000000003', 'Refleksi S.T.A.R', 'Refleksi 30 hari berturut-turut', '💎', 'Streak 30 hari'),
    ('00000000-0000-0000-0000-000000000004', 'Mingguan S.T.A.R', 'Skor purata >= 90% selama seminggu', '⭐', 'Weekly avg >= 90%'),
    ('00000000-0000-0000-0000-000000000005', 'Shining S.T.A.R of the Month', 'Skor purata >= 90% selama sebulan', '🏆', 'Monthly avg >= 90%'),
    ('00000000-0000-0000-0000-000000000006', 'Level Up S.T.A.R', 'Tingkatkan skor 20% dalam 2 minggu', '📈', 'Score increase 20%'),
    ('00000000-0000-0000-0000-000000000007', 'Buddy S.T.A.R', 'Skor hubungan rakan cemerlang selama sebulan', '🤝', 'Q8 = 3 for 30 days'),
    ('00000000-0000-0000-0000-000000000008', 'Emotion Check S.T.A.R', 'Tahap stres rendah selama sebulan', '🧘', 'Q9 = 3 for 30 days'),
    ('00000000-0000-0000-0000-000000000009', 'Self-Lead S.T.A.R', 'Tidak perlukan bantuan selama sebulan', '💪', 'Q10 = tidak for 30 days'),
    ('00000000-0000-0000-0000-000000000010', 'KJOS S.T.A.R', 'Capai semua badge', '👑', 'Earned all badges')
ON CONFLICT (id) DO NOTHING;

-- Note: Actual user accounts (murid, guru, GBK, ibu bapa) akan dibuat melalui:
-- 1. Supabase Auth signup (untuk prod)
-- 2. Script provision (scripts/seed-users.js) untuk bulk import murid
-- 
-- Format murid login:
--   username: 6 digit akhir IC (contoh: 010345)
--   password default: skmkj@1010.murid1234
--   must_change_password: true
--
-- Format guru/GBK:
--   email: gbk@smkkj.edu.my, guru.disiplin@smkkj.edu.my, etc.
--   password: di-set manual oleh admin
--
-- Format ibu bapa:
--   email: peribadi (contoh: ali.abu@gmail.com)
--   password: auto-generate via invite link (Fasa 2)

-- Placeholder comment untuk manual setup later
COMMENT ON TABLE profiles IS 'Users akan di-provision via Supabase Auth + script seed-users.js';
