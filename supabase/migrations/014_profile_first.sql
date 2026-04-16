-- 014_profile_first.sql
-- Profiles become the top-level public identity. Storefronts become purely commerce containers.

-- ============================================================
-- 1. Add identity / appearance columns to profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS banner_path TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS twitter TEXT,
  ADD COLUMN IF NOT EXISTS telegram TEXT,
  ADD COLUMN IF NOT EXISTS farcaster TEXT,
  ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Default slug to username for users who already have one
UPDATE profiles SET slug = username WHERE slug IS NULL AND username IS NOT NULL;

-- Unique index on slug (allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON profiles (slug) WHERE slug IS NOT NULL;

-- ============================================================
-- 2. Add profile_id FK to posts, custom_links, link_clicks, page_views
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

ALTER TABLE custom_links
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

ALTER TABLE link_clicks
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

-- ============================================================
-- 3. Backfill profile_id from storefront owner
-- ============================================================
UPDATE posts p
  SET profile_id = s.owner_id
  FROM storefronts s
  WHERE p.storefront_id = s.id AND p.profile_id IS NULL;

UPDATE custom_links cl
  SET profile_id = s.owner_id
  FROM storefronts s
  WHERE cl.storefront_id = s.id AND cl.profile_id IS NULL;

UPDATE link_clicks lc
  SET profile_id = s.owner_id
  FROM storefronts s
  WHERE lc.storefront_id = s.id AND lc.profile_id IS NULL;

UPDATE page_views pv
  SET profile_id = s.owner_id
  FROM storefronts s
  WHERE pv.storefront_id = s.id AND pv.profile_id IS NULL;

-- ============================================================
-- 4. Backfill profile appearance from storefronts
-- ============================================================
UPDATE profiles p
  SET
    bio = COALESCE(p.bio, s.bio),
    avatar_path = COALESCE(p.avatar_path, s.avatar_path),
    banner_path = COALESCE(p.banner_path, s.banner_path),
    website = COALESCE(p.website, s.website),
    twitter = COALESCE(p.twitter, s.twitter),
    telegram = COALESCE(p.telegram, s.telegram),
    farcaster = COALESCE(p.farcaster, s.farcaster),
    theme = CASE WHEN p.theme = '{}'::jsonb OR p.theme IS NULL THEN s.theme ELSE p.theme END
  FROM storefronts s
  WHERE s.owner_id = p.id;

-- ============================================================
-- 5. Make storefront_id nullable on all tables
-- ============================================================
ALTER TABLE posts ALTER COLUMN storefront_id DROP NOT NULL;
ALTER TABLE custom_links ALTER COLUMN storefront_id DROP NOT NULL;
ALTER TABLE link_clicks ALTER COLUMN storefront_id DROP NOT NULL;
ALTER TABLE page_views ALTER COLUMN storefront_id DROP NOT NULL;

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_profile_id ON posts (profile_id);
CREATE INDEX IF NOT EXISTS idx_custom_links_profile_id ON custom_links (profile_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_profile_id ON link_clicks (profile_id);
CREATE INDEX IF NOT EXISTS idx_page_views_profile_id ON page_views (profile_id);

-- ============================================================
-- 7. Recreate page_view_counts view with profile_id
-- ============================================================
DROP VIEW IF EXISTS page_view_counts;
CREATE VIEW page_view_counts AS
SELECT
  storefront_id,
  profile_id,
  COUNT(*) AS total_views,
  COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '24 hours') AS views_24h,
  COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '7 days') AS views_7d,
  MAX(viewed_at) AS last_viewed_at
FROM page_views
GROUP BY storefront_id, profile_id;

-- ============================================================
-- 8. Recreate link_click_counts view with profile_id
-- ============================================================
DROP VIEW IF EXISTS link_click_counts;
CREATE VIEW link_click_counts AS
SELECT
  link_id,
  lc.profile_id,
  COUNT(*) AS total_clicks,
  COUNT(*) FILTER (WHERE lc.clicked_at > NOW() - INTERVAL '24 hours') AS clicks_24h,
  COUNT(*) FILTER (WHERE lc.clicked_at > NOW() - INTERVAL '7 days') AS clicks_7d,
  MAX(lc.clicked_at) AS last_clicked_at
FROM link_clicks lc
GROUP BY link_id, lc.profile_id;
