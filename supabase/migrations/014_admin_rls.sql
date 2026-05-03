-- 014_admin_rls.sql
-- Allow accounts whose JWT app_metadata.role = 'admin' to write to games
-- and recommendations from the client. Cron uses the service-role key and
-- bypasses RLS, so it remains unaffected.
--
-- Set the role in Supabase dashboard:
--   Authentication → Users → <user> → Raw User Meta Data
--   add to app_metadata: {"role": "admin"}

CREATE POLICY "games_admin_all" ON games FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "recommendations_admin_all" ON recommendations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
