ALTER TABLE leagues ADD COLUMN IF NOT EXISTS bid_increment_tiers jsonb DEFAULT '[{"threshold": 0, "increment": 0.5}, {"threshold": 10, "increment": 1.0}]'::jsonb;
