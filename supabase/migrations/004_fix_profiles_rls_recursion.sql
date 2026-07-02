-- S.T.A.R KJo - Fix infinite recursion on profiles RLS
-- Run in Supabase SQL Editor if not using CLI migrate

-- This policy subqueries profiles inside profiles SELECT → error 42P17
DROP POLICY IF EXISTS "Students can view classmates" ON profiles;

-- Optional: ensure users can always read own row (idempotent)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

COMMENT ON POLICY "Users can view own profile" ON profiles IS
  'Own profile only; classmates policy removed to avoid RLS recursion';