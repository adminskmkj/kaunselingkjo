-- 023_update_badges.sql
--
-- Kemaskini senarai badge:
-- 1. Buang "Konsisten 7 Hari" (id ...0002)
-- 2. "Konsisten Sebulan" → "Refleksi S.T.A.R" (id ...0003)
-- 3. "Cemerlang Mingguan" → "Mingguan S.T.A.R" (id ...0004)
-- 4. "Cemerlang Bulanan" → "Bulanan S.T.A.R" (id ...0005)

-- Padam badge Konsisten 7 Hari + rekod student_badges berkaitan
DELETE FROM public.student_badges WHERE badge_id = '00000000-0000-0000-0000-000000000002';
DELETE FROM public.badges WHERE id = '00000000-0000-0000-0000-000000000002';

-- Rename badge
UPDATE public.badges SET
  name = 'Refleksi S.T.A.R',
  description = 'Refleksi 30 hari berturut-turut',
  icon_url = '💎',
  criteria = 'Streak 30 hari'
WHERE id = '00000000-0000-0000-0000-000000000003';

UPDATE public.badges SET
  name = 'Mingguan S.T.A.R',
  description = 'Skor purata >= 90% selama seminggu',
  icon_url = '⭐',
  criteria = 'Weekly avg >= 90%'
WHERE id = '00000000-0000-0000-0000-000000000004';

UPDATE public.badges SET
  name = 'Bulanan S.T.A.R',
  description = 'Skor purata >= 90% selama sebulan',
  icon_url = '🏆',
  criteria = 'Monthly avg >= 90%'
WHERE id = '00000000-0000-0000-0000-000000000005';
