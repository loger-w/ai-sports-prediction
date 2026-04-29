-- 008_drop_old_tables.sql
-- Drop legacy schema before introducing recommendations-centric model.
-- All historical prediction data is intentionally discarded; teams/sports preserved.

DROP VIEW IF EXISTS accuracy_stats;
DROP TABLE IF EXISTS prediction_results;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS games;
