-- 018_single_storefront_per_profile.sql
--
-- Enforce the invariant: each profile owns at most one storefront.
--
-- Background:
-- The original schema (003_commerce.sql) allowed a profile to own multiple
-- storefronts, but every app surface (creator page, dashboard, edge function
-- store-lookup) was implemented assuming 1:1. This drift caused bugs where
-- products attached to a non-primary storefront silently disappeared from the
-- public page.
--
-- This migration:
--   1. Collapses any existing duplicates to the oldest storefront per owner,
--      re-parenting their products/posts/links onto the kept row.
--   2. Adds a UNIQUE index on storefronts.owner_id so new duplicates are
--      rejected by the database, not just by application code.
--
-- Safe to run in any environment: the collapse step is a no-op if no owner
-- has more than one storefront. The unique index is created with IF NOT EXISTS.

BEGIN;

-- Step 1: For each owner with >1 storefront, keep the oldest and re-parent
-- every related row from the duplicates onto it, then delete the duplicates.
WITH keepers AS (
    SELECT DISTINCT ON (owner_id) id AS keeper_id, owner_id
    FROM storefronts
    ORDER BY owner_id, created_at ASC
),
duplicates AS (
    SELECT s.id AS dup_id, k.keeper_id
    FROM storefronts s
    JOIN keepers k ON k.owner_id = s.owner_id
    WHERE s.id <> k.keeper_id
)
UPDATE products p
SET storefront_id = d.keeper_id
FROM duplicates d
WHERE p.storefront_id = d.dup_id;

WITH keepers AS (
    SELECT DISTINCT ON (owner_id) id AS keeper_id, owner_id
    FROM storefronts
    ORDER BY owner_id, created_at ASC
),
duplicates AS (
    SELECT s.id AS dup_id, k.keeper_id
    FROM storefronts s
    JOIN keepers k ON k.owner_id = s.owner_id
    WHERE s.id <> k.keeper_id
)
UPDATE posts p
SET storefront_id = d.keeper_id
FROM duplicates d
WHERE p.storefront_id = d.dup_id;

WITH keepers AS (
    SELECT DISTINCT ON (owner_id) id AS keeper_id, owner_id
    FROM storefronts
    ORDER BY owner_id, created_at ASC
),
duplicates AS (
    SELECT s.id AS dup_id, k.keeper_id
    FROM storefronts s
    JOIN keepers k ON k.owner_id = s.owner_id
    WHERE s.id <> k.keeper_id
)
UPDATE custom_links cl
SET storefront_id = d.keeper_id
FROM duplicates d
WHERE cl.storefront_id = d.dup_id;

-- Re-parent analytics so they survive the storefront delete (storefronts(id)
-- has ON DELETE CASCADE on these tables). Technically the click/view
-- originated on the duplicate storefront's page, but since we're consolidating
-- identities this is the correct aggregate going forward.
WITH keepers AS (
    SELECT DISTINCT ON (owner_id) id AS keeper_id, owner_id
    FROM storefronts
    ORDER BY owner_id, created_at ASC
),
duplicates AS (
    SELECT s.id AS dup_id, k.keeper_id
    FROM storefronts s
    JOIN keepers k ON k.owner_id = s.owner_id
    WHERE s.id <> k.keeper_id
)
UPDATE link_clicks lc
SET storefront_id = d.keeper_id
FROM duplicates d
WHERE lc.storefront_id = d.dup_id;

WITH keepers AS (
    SELECT DISTINCT ON (owner_id) id AS keeper_id, owner_id
    FROM storefronts
    ORDER BY owner_id, created_at ASC
),
duplicates AS (
    SELECT s.id AS dup_id, k.keeper_id
    FROM storefronts s
    JOIN keepers k ON k.owner_id = s.owner_id
    WHERE s.id <> k.keeper_id
)
UPDATE page_views pv
SET storefront_id = d.keeper_id
FROM duplicates d
WHERE pv.storefront_id = d.dup_id;

-- Now delete the orphaned storefronts. Any other table that references
-- storefronts.id via ON DELETE CASCADE will clean up automatically. If a
-- table references it via ON DELETE RESTRICT and still has rows, this
-- DELETE will fail loudly — that's desired, it means the re-parenting above
-- missed a table that needs to be added.
DELETE FROM storefronts s
WHERE EXISTS (
    SELECT 1
    FROM storefronts other
    WHERE other.owner_id = s.owner_id
      AND other.created_at < s.created_at
);

-- Step 2: Physically enforce one-storefront-per-owner going forward.
CREATE UNIQUE INDEX IF NOT EXISTS storefronts_owner_id_key
    ON storefronts (owner_id);

COMMIT;
