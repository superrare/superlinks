-- Seed data for development/testing
-- Run with: psql $DATABASE_URL -f supabase/seed.sql
-- Or paste into Supabase SQL Editor

-- ============================================================
-- Fake users (insert directly into auth.users + profiles)
-- ============================================================

-- Helper: deterministic UUIDs for seed data
-- user1: alice (digital artist)
-- user2: bob (music producer)
-- user3: carol (photographer)
-- user4: dave (writer)
-- user5: eve (3d designer)

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice@example.com', crypt('password123', gen_salt('bf')), now(), now() - interval '30 days', now(), '', ''),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@example.com', crypt('password123', gen_salt('bf')), now(), now() - interval '25 days', now(), '', ''),
  ('c3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carol@example.com', crypt('password123', gen_salt('bf')), now(), now() - interval '20 days', now(), '', ''),
  ('d4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dave@example.com', crypt('password123', gen_salt('bf')), now(), now() - interval '15 days', now(), '', ''),
  ('e5555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eve@example.com', crypt('password123', gen_salt('bf')), now(), now() - interval '10 days', now(), '', '')
ON CONFLICT (id) DO NOTHING;

-- Profiles (the trigger should auto-create, but upsert to be safe)
INSERT INTO public.profiles (id, username, display_name, email, follower_count, following_count, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'alice', 'Alice Chen', 'alice@example.com', 3, 1, now() - interval '30 days'),
  ('b2222222-2222-2222-2222-222222222222', 'bob', 'Bob Martinez', 'bob@example.com', 2, 2, now() - interval '25 days'),
  ('c3333333-3333-3333-3333-333333333333', 'carol', 'Carol Kim', 'carol@example.com', 1, 2, now() - interval '20 days'),
  ('d4444444-4444-4444-4444-444444444444', 'dave', 'Dave Thompson', 'dave@example.com', 1, 2, now() - interval '15 days'),
  ('e5555555-5555-5555-5555-555555555555', 'eve', 'Eve Nakamura', 'eve@example.com', 1, 1, now() - interval '10 days')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  follower_count = EXCLUDED.follower_count,
  following_count = EXCLUDED.following_count;

-- ============================================================
-- Storefronts
-- ============================================================

INSERT INTO public.storefronts (id, owner_id, name, slug, description, bio, website, twitter, created_at)
VALUES
  ('aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
   'Alice''s Art Studio', 'alice-art-studio',
   'Digital art and illustrations',
   'Digital artist exploring the intersection of AI and hand-drawn art. Selling original wallpapers, illustrations, and design assets.',
   'https://aliceart.xyz', 'alicechenart',
   now() - interval '28 days'),

  ('bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   'Bob Beats', 'bob-beats',
   'Lo-fi beats and sample packs',
   'Music producer based in LA. Crafting lo-fi beats, sample packs, and stems for creators.',
   'https://bobbeats.io', 'bobmartinezbeats',
   now() - interval '22 days'),

  ('cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
   'Carol''s Lens', 'carols-lens',
   'Street photography prints and presets',
   'Street photographer capturing everyday moments in Tokyo, NYC, and Seoul. Prints and Lightroom presets.',
   'https://carolkim.photo', 'carolkim_photo',
   now() - interval '18 days'),

  ('dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
   'Dave Writes', 'dave-writes',
   'Guides, essays, and templates',
   'Writer and indie hacker. Publishing guides on building in public, crypto, and creative tools.',
   'https://davewrites.co', 'dave_writes',
   now() - interval '12 days'),

  ('ee555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
   'Eve 3D', 'eve-3d',
   '3D models, textures, and assets',
   '3D artist creating game-ready assets, textures, and environment kits. Blender and Unreal compatible.',
   'https://eve3d.art', 'eve_3d_art',
   now() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Products (no actual files — just metadata for display)
-- ============================================================

INSERT INTO public.products (id, storefront_id, creator_id, title, description, price, content_type, file_path, file_size_bytes, mime_type, status, created_at)
VALUES
  -- Alice's products
  ('f1000001-0000-0000-0000-000000000001', 'aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
   'Neon City Wallpaper Pack', '5 high-res cyberpunk wallpapers (4K)', '2.00', 'image',
   'seed/neon-city.zip', 15000000, 'application/zip', 'active', now() - interval '26 days'),

  ('f1000002-0000-0000-0000-000000000002', 'aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
   'Abstract Gradient Collection', '10 abstract gradient backgrounds for web and mobile', '3.50', 'image',
   'seed/gradients.zip', 8000000, 'application/zip', 'active', now() - interval '20 days'),

  ('f1000003-0000-0000-0000-000000000003', 'aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
   'Pixel Art Character Sheet', 'Retro RPG character sprites — 32x32 px, 12 animations', '5.00', 'image',
   'seed/pixel-chars.png', 2000000, 'image/png', 'active', now() - interval '10 days'),

  -- Bob's products
  ('f2000001-0000-0000-0000-000000000001', 'bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   'Lo-fi Study Beats Vol. 1', '10 tracks, chill lo-fi beats for studying and coding', '4.00', 'bundle',
   'seed/lofi-vol1.zip', 45000000, 'application/zip', 'active', now() - interval '20 days'),

  ('f2000002-0000-0000-0000-000000000002', 'bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   'Drum Kit — Vinyl Crackle', 'One-shots and loops: kicks, snares, hats, vinyl textures', '6.00', 'bundle',
   'seed/drumkit.zip', 30000000, 'application/zip', 'active', now() - interval '14 days'),

  ('f2000003-0000-0000-0000-000000000003', 'bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   'Ambient Pad Samples', 'Lush ambient pads and drones, royalty-free', '3.00', 'bundle',
   'seed/ambient-pads.zip', 25000000, 'application/zip', 'active', now() - interval '5 days'),

  -- Carol's products
  ('f3000001-0000-0000-0000-000000000001', 'cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
   'Tokyo Nights Print', 'High-res print: rain-soaked Shibuya crossing at midnight', '8.00', 'image',
   'seed/tokyo-nights.jpg', 12000000, 'image/jpeg', 'active', now() - interval '16 days'),

  ('f3000002-0000-0000-0000-000000000002', 'cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
   'Street Photography Presets', '12 Lightroom presets — moody, cinematic, film emulation', '5.00', 'bundle',
   'seed/presets.zip', 500000, 'application/zip', 'active', now() - interval '12 days'),

  -- Dave's products
  ('f4000001-0000-0000-0000-000000000001', 'dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
   'The Indie Hacker Playbook', 'A 60-page guide to building and launching your first product', '10.00', 'pdf',
   'seed/playbook.pdf', 3500000, 'application/pdf', 'active', now() - interval '10 days'),

  ('f4000002-0000-0000-0000-000000000002', 'dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
   'Notion Startup Template', 'All-in-one Notion workspace for solo founders', '4.00', 'other',
   'seed/startup-template.zip', 800000, 'application/zip', 'active', now() - interval '6 days'),

  -- Eve's products
  ('f5000001-0000-0000-0000-000000000001', 'ee555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
   'Low-Poly Tree Pack', '20 stylized low-poly trees for games — FBX + Blender', '7.00', 'bundle',
   'seed/trees.zip', 18000000, 'application/zip', 'active', now() - interval '7 days'),

  ('f5000002-0000-0000-0000-000000000002', 'ee555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
   'Sci-Fi Texture Atlas', 'Seamless PBR textures: metal panels, greebles, rust', '5.50', 'image',
   'seed/scifi-textures.zip', 22000000, 'application/zip', 'active', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Follows (creates a social graph)
-- ============================================================

INSERT INTO public.follows (follower_id, following_id, created_at)
VALUES
  -- Everyone follows Alice (she's popular)
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', now() - interval '18 days'),
  ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', now() - interval '15 days'),
  ('d4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', now() - interval '12 days'),

  -- Bob & Carol follow each other
  ('b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', now() - interval '14 days'),
  ('c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', now() - interval '13 days'),

  -- Dave follows Bob and Eve
  ('d4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', now() - interval '10 days'),
  ('d4444444-4444-4444-4444-444444444444', 'e5555555-5555-5555-5555-555555555555', now() - interval '8 days'),

  -- Eve follows Alice
  ('e5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', now() - interval '6 days'),

  -- Alice follows Bob
  ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', now() - interval '16 days')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ============================================================
-- Posts (creator updates)
-- ============================================================

INSERT INTO public.posts (storefront_id, author_id, content, created_at)
VALUES
  ('aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
   'Just dropped the Neon City wallpaper pack! 5 cyberpunk wallpapers in 4K. Perfect for your desktop or phone.',
   now() - interval '26 days'),

  ('aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
   'Working on a new collection — hand-drawn botanical illustrations. Coming next week!',
   now() - interval '5 days'),

  ('bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   'Lo-fi Study Beats Vol. 1 is live! 10 tracks to keep you in the zone. All royalty-free for content creators.',
   now() - interval '20 days'),

  ('bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   'New drum kit just dropped. Vinyl crackle, warm kicks, dusty hats. Made for that old-school sound.',
   now() - interval '14 days'),

  ('cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
   'Back from Tokyo! Shot 2000+ photos over 3 weeks. First print dropping this week — Shibuya at midnight.',
   now() - interval '17 days'),

  ('cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
   'Preset pack is here. 12 presets I use on every shoot — moody tones, film grain, cinematic color.',
   now() - interval '12 days'),

  ('dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
   'The Indie Hacker Playbook is live! Everything I learned building 3 products to $10k MRR. No fluff.',
   now() - interval '10 days'),

  ('dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
   'Added a Notion template to the store — the same workspace I use to run my startup. OKRs, roadmap, CRM, all in one.',
   now() - interval '6 days'),

  ('ee555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
   'Low-poly tree pack is out! 20 stylized trees, Blender source files included. Great for indie games.',
   now() - interval '7 days'),

  ('ee555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
   'Next up: a modular sci-fi environment kit. Corridors, airlocks, control rooms. Unreal and Blender.',
   now() - interval '1 day');

-- ============================================================
-- Sample messages between users
-- ============================================================

INSERT INTO public.messages (sender_id, recipient_id, encrypted_content, sender_public_key, read, created_at)
VALUES
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111',
   'Hey Alice! Love the neon city wallpapers. Would you be down to collab on an album cover?',
   'web', true, now() - interval '24 days'),

  ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222',
   'Thanks Bob! I''d be totally down. What vibe are you going for?',
   'web', true, now() - interval '24 days' + interval '2 hours'),

  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111',
   'Thinking retro-futuristic, neon grids, sunset palette. For the next lo-fi tape.',
   'web', true, now() - interval '23 days'),

  ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222',
   'Oh that sounds perfect. Let me sketch some ideas this weekend and send them over.',
   'web', true, now() - interval '23 days' + interval '1 hour'),

  ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111',
   'Your gradient collection is amazing! Can I use one as a backdrop for a print series?',
   'web', true, now() - interval '18 days'),

  ('a1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333',
   'Of course! Go for it. Would love to see how it turns out.',
   'web', true, now() - interval '18 days' + interval '3 hours'),

  ('d4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222',
   'Bought your drum kit — it''s incredible. Using it for a podcast intro.',
   'web', true, now() - interval '12 days'),

  ('b2222222-2222-2222-2222-222222222222', 'd4444444-4444-4444-4444-444444444444',
   'Awesome! Send me a link when it''s live, I''ll share it.',
   'web', false, now() - interval '12 days' + interval '30 minutes'),

  ('e5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333',
   'Carol, your Tokyo shots are incredible. I''m building a virtual Tokyo scene and would love to reference your work.',
   'web', false, now() - interval '4 days'),

  ('d4444444-4444-4444-4444-444444444444', 'e5555555-5555-5555-5555-555555555555',
   'The tree pack is great! Any plans for a building/architecture pack?',
   'web', false, now() - interval '2 days')
ON CONFLICT DO NOTHING;
