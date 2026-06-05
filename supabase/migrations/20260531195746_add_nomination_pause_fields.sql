ALTER TABLE public.auction_nominations
ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_seconds integer;
