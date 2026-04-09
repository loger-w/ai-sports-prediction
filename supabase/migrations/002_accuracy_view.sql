CREATE OR REPLACE VIEW accuracy_stats AS
SELECT
  g.sport_id,
  g.game_date,
  COUNT(*) AS total_predictions,
  COUNT(*) FILTER (WHERE pr.winner_correct = true) AS winner_hits,
  COUNT(*) FILTER (WHERE pr.over_under_correct = true) AS ou_hits,
  ROUND(
    COUNT(*) FILTER (WHERE pr.winner_correct = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1
  ) AS winner_pct,
  ROUND(
    COUNT(*) FILTER (WHERE pr.over_under_correct = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1
  ) AS ou_pct
FROM prediction_results pr
JOIN predictions p ON pr.prediction_id = p.id
JOIN games g ON pr.game_id = g.id
WHERE g.status = 'final'
GROUP BY g.sport_id, g.game_date;
