-- Backfill slug from username for profiles that have a username but no slug
UPDATE profiles SET slug = username WHERE slug IS NULL AND username IS NOT NULL;
