// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json, publicUrl, slugify } from "../../_shared/utils.ts";
import type { GetHandlerCtx, PostHandlerCtx } from "../../_shared/types.ts";
import { svcSupabase } from "../../_shared/supabase.ts";

// GET /commerce/store/:slug
export async function handleStore(ctx: GetHandlerCtx): Promise<Response> {
  const slug = ctx.resourceId;
  const supabase = svcSupabase;

  let profile: Record<string, unknown> | null = null;
  const { data: bySlug } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_path, banner_path, website, twitter, telegram, farcaster, theme, slug, follower_count, following_count",
    )
    .eq("slug", slug)
    .single();
  if (bySlug) {
    profile = bySlug;
  } else {
    const { data: byUsername } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, bio, avatar_path, banner_path, website, twitter, telegram, farcaster, theme, slug, follower_count, following_count",
      )
      .eq("username", slug)
      .single();
    profile = byUsername;
  }

  if (!profile) return json({ error: "Profile not found" }, 404);

  if (profile.avatar_path) {
    profile.avatar_url = publicUrl(supabase, "storefront-assets", profile.avatar_path as string);
  }
  if (profile.banner_path) {
    profile.banner_url = publicUrl(supabase, "storefront-assets", profile.banner_path as string);
  }

  // Use order+limit+maybeSingle instead of .single() to handle users with multiple storefronts
  const { data: storefront } = await supabase
    .from("storefronts")
    .select("id, name, slug")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [{ data: products }, postsResult, linksResult] = await Promise.all([
    storefront
      ? supabase
          .from("products")
          .select(
            "id, title, description, price, content_type, preview_path, created_at, metadata",
          )
          .eq("storefront_id", storefront.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("posts")
      .select(
        "id, content, media_url, media_type, created_at, profiles!posts_author_id_fkey(username, display_name)",
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? [])
      .catch(() => []),
    supabase
      .from("custom_links")
      .select("id, title, url, icon, sort_order")
      .eq("profile_id", profile.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then((r) => r.data ?? [])
      .catch(() => []),
  ]);

  const productsWithPreviews = (products ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    preview_url: p.preview_path
      ? publicUrl(supabase, "commerce-previews", p.preview_path as string)
      : null,
  }));

  const fundraiserIds = productsWithPreviews
    .filter((p: Record<string, unknown>) => p.content_type === "fundraiser")
    .map((p: Record<string, unknown>) => p.id as string);

  let fundraiserStats: Record<string, { total_raised: number; supporter_count: number }> = {};
  if (fundraiserIds.length > 0) {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("product_id, price_paid")
      .in("product_id", fundraiserIds);
    if (purchases) {
      for (const purchase of purchases) {
        const pid = purchase.product_id;
        if (!fundraiserStats[pid])
          fundraiserStats[pid] = { total_raised: 0, supporter_count: 0 };
        fundraiserStats[pid].total_raised += parseFloat(purchase.price_paid);
        fundraiserStats[pid].supporter_count += 1;
      }
    }
  }

  const productsWithStats = productsWithPreviews.map((p: Record<string, unknown>) => {
    if (p.content_type === "fundraiser") {
      const stats = fundraiserStats[p.id as string] ?? {
        total_raised: 0,
        supporter_count: 0,
      };
      return { ...p, total_raised: stats.total_raised, supporter_count: stats.supporter_count };
    }
    return p;
  });

  return json({
    storefront: {
      ...profile,
      ...(storefront
        ? {
            storefront_id: storefront.id,
            storefront_name: storefront.name,
            storefront_slug: storefront.slug,
          }
        : {}),
    },
    products: productsWithStats,
    posts: postsResult,
    links: linksResult,
  });
}

// POST create-storefront
export async function createStorefront(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const name = body.name as string;
  const description = (body.description as string) ?? null;
  if (!name) return json({ error: "Missing 'name'" }, 400);

  const slug = slugify(name);
  const { data: storefront, error } = await supabase
    .from("storefronts")
    .insert({ owner_id: user.id, name, description, slug })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return json({ error: "Storefront slug already taken" }, 409);
    return json({ error: error.message }, 500);
  }
  return json(storefront);
}

// POST my-storefronts
export async function myStorefronts(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase } = ctx;
  const { data, error } = await supabase
    .from("storefronts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);

  const withUrls = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    avatar_url: s.avatar_path
      ? publicUrl(supabase, "storefront-assets", s.avatar_path as string)
      : null,
    banner_url: s.banner_path
      ? publicUrl(supabase, "storefront-assets", s.banner_path as string)
      : null,
  }));

  return json({ storefronts: withUrls });
}

// POST update-storefront
export async function updateStorefront(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const storefrontId = body.storefrontId as string;
  if (!storefrontId) return json({ error: "Missing 'storefrontId'" }, 400);

  const { data: owned } = await supabase
    .from("storefronts")
    .select("id")
    .eq("id", storefrontId)
    .eq("owner_id", user.id)
    .single();

  if (!owned) return json({ error: "Storefront not found or not yours" }, 404);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedFields = [
    "name",
    "description",
    "bio",
    "website",
    "twitter",
    "telegram",
    "farcaster",
    "theme",
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (body.avatarContent && body.avatarFileName) {
    const avatarBytes = Uint8Array.from(atob(body.avatarContent as string), (c) =>
      c.charCodeAt(0),
    );
    const avatarPath = `${user.id}/${storefrontId}/avatar_${body.avatarFileName}`;
    await supabase.storage.from("storefront-assets").remove([avatarPath]);
    const { error: avatarUploadErr } = await supabase.storage
      .from("storefront-assets")
      .upload(avatarPath, avatarBytes, {
        contentType: (body.avatarMimeType as string) ?? "image/png",
      });
    if (avatarUploadErr)
      return json({ error: `Avatar upload failed: ${avatarUploadErr.message}` }, 500);
    updates.avatar_path = avatarPath;
  }

  if (body.bannerContent && body.bannerFileName) {
    const bannerBytes = Uint8Array.from(atob(body.bannerContent as string), (c) =>
      c.charCodeAt(0),
    );
    const bannerPath = `${user.id}/${storefrontId}/banner_${body.bannerFileName}`;
    await supabase.storage.from("storefront-assets").remove([bannerPath]);
    const { error: bannerUploadErr } = await supabase.storage
      .from("storefront-assets")
      .upload(bannerPath, bannerBytes, {
        contentType: (body.bannerMimeType as string) ?? "image/png",
      });
    if (bannerUploadErr)
      return json({ error: `Banner upload failed: ${bannerUploadErr.message}` }, 500);
    updates.banner_path = bannerPath;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("storefronts")
    .update(updates)
    .eq("id", storefrontId)
    .select()
    .single();

  if (updateErr) return json({ error: updateErr.message }, 500);

  updated.avatar_url = updated.avatar_path
    ? publicUrl(supabase, "storefront-assets", updated.avatar_path)
    : null;
  updated.banner_url = updated.banner_path
    ? publicUrl(supabase, "storefront-assets", updated.banner_path)
    : null;

  return json(updated);
}

// POST get-storefront
export async function getStorefront(ctx: PostHandlerCtx): Promise<Response> {
  const { supabase, body } = ctx;
  const slug = body.slug as string;
  const storefrontId = body.storefrontId as string;

  let query = supabase
    .from("storefronts")
    .select("*, profiles!inner(username, display_name, follower_count, following_count)");
  if (slug) query = query.eq("slug", slug);
  else if (storefrontId) query = query.eq("id", storefrontId);
  else return json({ error: "Missing 'slug' or 'storefrontId'" }, 400);

  const { data: storefront, error } = await query.single();
  if (error || !storefront) return json({ error: "Storefront not found" }, 404);

  storefront.avatar_url = storefront.avatar_path
    ? publicUrl(supabase, "storefront-assets", storefront.avatar_path)
    : null;
  storefront.banner_url = storefront.banner_path
    ? publicUrl(supabase, "storefront-assets", storefront.banner_path)
    : null;

  const [{ data: products }, storefrontPosts] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("storefront_id", storefront.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(username, display_name)")
      .eq("storefront_id", storefront.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) =>
        (r.data ?? []).map((p: Record<string, unknown>) => ({
          ...p,
          media_url: p.media_path
            ? publicUrl(supabase, "commerce-previews", p.media_path as string)
            : null,
        })),
      )
      .catch(() => []),
  ]);

  const productsWithPreviews = (products ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    preview_url: p.preview_path
      ? publicUrl(supabase, "commerce-previews", p.preview_path as string)
      : null,
  }));

  return json({ storefront, products: productsWithPreviews, posts: storefrontPosts });
}

// POST list-storefronts
export async function listStorefronts(ctx: PostHandlerCtx): Promise<Response> {
  const { supabase } = ctx;
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_path, banner_path, slug, follower_count, following_count",
    )
    .not("username", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return json({ error: error.message }, 500);

  const profilesWithUrls = (profiles ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    avatar_url: p.avatar_path
      ? publicUrl(supabase, "storefront-assets", p.avatar_path as string)
      : null,
    banner_url: p.banner_path
      ? publicUrl(supabase, "storefront-assets", p.banner_path as string)
      : null,
  }));

  const profileIds = profilesWithUrls.map((p: any) => p.id);
  const { data: stores } = await supabase
    .from("storefronts")
    .select("id, owner_id")
    .in("owner_id", profileIds);

  const storeByOwner: Record<string, string> = {};
  for (const s of stores ?? []) {
    storeByOwner[s.owner_id] = s.id;
  }

  const storeIds = Object.values(storeByOwner);
  const { data: productCounts } =
    storeIds.length > 0
      ? await supabase
          .from("products")
          .select("storefront_id")
          .in("storefront_id", storeIds)
          .eq("status", "active")
      : { data: [] };

  const countMap: Record<string, number> = {};
  for (const p of productCounts ?? []) {
    countMap[p.storefront_id] = (countMap[p.storefront_id] ?? 0) + 1;
  }

  const result = profilesWithUrls.map((p: any) => ({
    ...p,
    product_count: countMap[storeByOwner[p.id]] ?? 0,
  }));

  return json({ storefronts: result });
}
