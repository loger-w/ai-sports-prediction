-- 014_admin_rls.sql
-- Allow accounts whose JWT app_metadata.role = 'admin' to write to games
-- and recommendations from the client. Cron uses the service-role key and
-- bypasses RLS, so it remains unaffected.
--
-- Set the role on a registered user. Two ways:
--   A) Dashboard: Authentication → Users → <user> → "Raw App Meta Data"
--      → JSON: {"role": "admin"}
--   B) SQL:
--      UPDATE auth.users
--      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
--                              || '{"role":"admin"}'::jsonb
--      WHERE email = '<admin-email>';
-- The user must sign out and sign back in for the new JWT to carry the role.

CREATE POLICY "games_admin_all" ON games FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "recommendations_admin_all" ON recommendations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
