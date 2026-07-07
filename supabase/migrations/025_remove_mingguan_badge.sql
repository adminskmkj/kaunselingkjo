-- 025_remove_mingguan_badge.sql
-- Buang badge Mingguan S.T.A.R

DELETE FROM public.student_badges WHERE badge_id = '00000000-0000-0000-0000-000000000004';
DELETE FROM public.badges WHERE id = '00000000-0000-0000-0000-000000000004';
