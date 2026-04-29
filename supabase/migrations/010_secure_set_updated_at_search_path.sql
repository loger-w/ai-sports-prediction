-- 010_secure_set_updated_at_search_path.sql
-- Set search_path on trigger function to prevent search_path manipulation.
-- Supabase advisor lint 0011_function_search_path_mutable.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
