-- 013_recommendations_source.sql
-- Distinguish cron-ingested vs admin-manual recommendations.
-- Cron's delete-and-replace path will be filtered to source='cron' so
-- admin-manual recommendations survive subsequent ingest runs.

ALTER TABLE recommendations
  ADD COLUMN source TEXT NOT NULL DEFAULT 'cron'
    CHECK (source IN ('cron', 'manual'));

CREATE INDEX recommendations_source_idx ON recommendations(source);
