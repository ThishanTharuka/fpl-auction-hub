CREATE TABLE IF NOT EXISTS fpl_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public data cache; any role can read/write
ALTER TABLE fpl_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fpl_cache"
  ON fpl_cache FOR SELECT USING (true);

CREATE POLICY "Anyone can upsert fpl_cache"
  ON fpl_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update fpl_cache"
  ON fpl_cache FOR UPDATE USING (true);
