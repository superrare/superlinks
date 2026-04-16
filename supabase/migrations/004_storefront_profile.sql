-- Add profile customization fields to storefronts

ALTER TABLE public.storefronts
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS banner_path TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS twitter TEXT,
  ADD COLUMN IF NOT EXISTS telegram TEXT,
  ADD COLUMN IF NOT EXISTS farcaster TEXT,
  ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}';

-- Public bucket for storefront assets (avatars, banners)
INSERT INTO storage.buckets (id, name, public) VALUES ('storefront-assets', 'storefront-assets', true)
  ON CONFLICT DO NOTHING;
