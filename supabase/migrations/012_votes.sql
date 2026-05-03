-- 012_votes.sql
-- Per-recommendation upvote / downvote.
-- Note: recommendations PK is (game_id, market) — votes use a composite FK.

-- Denormalised vote counts on recommendations to avoid N+1 aggregates on read.
ALTER TABLE recommendations
  ADD COLUMN vote_up_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN vote_down_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE votes (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id    UUID NOT NULL,
  market     TEXT NOT NULL,
  value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id, market),
  FOREIGN KEY (game_id, market)
    REFERENCES recommendations(game_id, market)
    ON DELETE CASCADE
);

CREATE INDEX votes_recommendation_idx ON votes(game_id, market);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Public read so visitors see counts.
CREATE POLICY "votes_select_all" ON votes
  FOR SELECT USING (true);

-- Authenticated users can only write their own votes.
CREATE POLICY "votes_insert_own" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_update_own" ON votes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete_own" ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at upkeep
CREATE TRIGGER trg_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Maintain vote_up_count / vote_down_count on recommendations.
CREATE OR REPLACE FUNCTION update_recommendation_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.value = 1 THEN
      UPDATE recommendations SET vote_up_count = vote_up_count + 1
        WHERE game_id = NEW.game_id AND market = NEW.market;
    ELSE
      UPDATE recommendations SET vote_down_count = vote_down_count + 1
        WHERE game_id = NEW.game_id AND market = NEW.market;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.value <> NEW.value THEN
    IF OLD.value = 1 THEN
      UPDATE recommendations
        SET vote_up_count   = vote_up_count - 1,
            vote_down_count = vote_down_count + 1
        WHERE game_id = NEW.game_id AND market = NEW.market;
    ELSE
      UPDATE recommendations
        SET vote_up_count   = vote_up_count + 1,
            vote_down_count = vote_down_count - 1
        WHERE game_id = NEW.game_id AND market = NEW.market;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.value = 1 THEN
      UPDATE recommendations SET vote_up_count = vote_up_count - 1
        WHERE game_id = OLD.game_id AND market = OLD.market;
    ELSE
      UPDATE recommendations SET vote_down_count = vote_down_count - 1
        WHERE game_id = OLD.game_id AND market = OLD.market;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recommendation_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_recommendation_vote_counts();
