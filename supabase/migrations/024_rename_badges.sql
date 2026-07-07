-- 024_rename_badges.sql
-- Rename semua badge ikut nama baru

UPDATE public.badges SET name = 'First S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.badges SET name = 'Refleksi S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000003';
UPDATE public.badges SET name = 'Mingguan S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000004';
UPDATE public.badges SET name = 'Shining S.T.A.R of the Month' WHERE id = '00000000-0000-0000-0000-000000000005';
UPDATE public.badges SET name = 'Level Up S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000006';
UPDATE public.badges SET name = 'Buddy S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000007';
UPDATE public.badges SET name = 'Emotion Check S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000008';
UPDATE public.badges SET name = 'Self-Lead S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000009';
UPDATE public.badges SET name = 'KJOS S.T.A.R' WHERE id = '00000000-0000-0000-0000-000000000010';
