// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json, publicUrl, escapeHtml, corsHeaders } from "../../_shared/utils.ts";
import type { GetHandlerCtx, PostHandlerCtx } from "../../_shared/types.ts";
import { svcSupabase } from "../../_shared/supabase.ts";

// GET /commerce/og/:slug
export async function handleOg(ctx: GetHandlerCtx): Promise<Response> {
  const slug = ctx.resourceId;
  if (!slug) return json({ error: "Missing slug" }, 400);
  const supabase = svcSupabase;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_path")
    .eq("slug", slug)
    .maybeSingle();
  const sf =
    profile ??
    (
      await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_path")
        .eq("username", slug)
        .maybeSingle()
    ).data;

  if (!sf) return json({ error: "Profile not found" }, 404);

  const rawDisplayName = sf.display_name ?? sf.username ?? slug;
  const rawDescription = sf.bio ?? `Check out ${rawDisplayName} on Rare Protocol`;
  const imageUrl = sf.avatar_path ? publicUrl("storefront-assets", sf.avatar_path) : "";
  const rawPageUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")}/link.html?s=${slug}`;

  const displayName = escapeHtml(rawDisplayName);
  const description = escapeHtml(rawDescription);
  const pageUrl = escapeHtml(rawPageUrl);
  const safeImageUrl = imageUrl ? escapeHtml(imageUrl) : "";

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<title>${displayName} — Rare Protocol</title>
<meta property="og:title" content="${displayName} — Rare Protocol" />
<meta property="og:description" content="${description}" />
<meta property="og:type" content="profile" />
<meta property="og:url" content="${pageUrl}" />
${safeImageUrl ? `<meta property="og:image" content="${safeImageUrl}" />` : ""}
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${displayName} — Rare Protocol" />
<meta name="twitter:description" content="${description}" />
${safeImageUrl ? `<meta name="twitter:image" content="${safeImageUrl}" />` : ""}
<meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head><body><p>Redirecting to <a href="${pageUrl}">${displayName}</a>...</p></body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

// GET /commerce/check-username/:username
export async function handleCheckUsername(ctx: GetHandlerCtx): Promise<Response> {
  const username = ctx.resourceId.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return json({
      available: false,
      reason: "Must be 3-30 characters (letters, numbers, hyphens, underscores)",
    });
  }
  // username has a unique constraint in the DB; maybeSingle avoids a 500 on
  // accidental duplicates and treats "no row" as available.
  const { data } = await svcSupabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return json({ available: !data, username });
}

// POST update-username
export async function updateUsername(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const newUsername = ((body.username as string) ?? "").trim().toLowerCase();
  if (!newUsername) return json({ error: "Missing 'username'" }, 400);
  if (!/^[a-z0-9_-]{3,30}$/.test(newUsername)) {
    return json(
      {
        error:
          "Handle must be 3-30 characters, lowercase letters, numbers, hyphens, or underscores",
      },
      400,
    );
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", newUsername)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) return json({ error: "That handle is already taken" }, 409);

  const { data: existingSlug } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", newUsername)
    .neq("id", user.id)
    .maybeSingle();
  if (existingSlug) return json({ error: "That handle is already taken" }, 409);

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ username: newUsername, slug: newUsername })
    .eq("id", user.id);
  if (updateErr) return json({ error: updateErr.message }, 500);

  return json({ username: newUsername });
}

// POST update-profile
export async function updateProfile(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const profileUpdates: Record<string, unknown> = {};
  const allowedProfileFields = [
    "bio",
    "website",
    "twitter",
    "telegram",
    "farcaster",
    "theme",
    "display_name",
  ];
  for (const field of allowedProfileFields) {
    if (body[field] !== undefined) profileUpdates[field] = body[field];
  }

  if (body.avatarContent && body.avatarFileName) {
    const avatarBytes = Uint8Array.from(atob(body.avatarContent as string), (c) =>
      c.charCodeAt(0),
    );
    const avatarPath = `${user.id}/profile/avatar_${body.avatarFileName}`;
    await supabase.storage.from("storefront-assets").remove([avatarPath]);
    const { error: avatarUploadErr } = await supabase.storage
      .from("storefront-assets")
      .upload(avatarPath, avatarBytes, {
        contentType: (body.avatarMimeType as string) ?? "image/png",
      });
    if (avatarUploadErr)
      return json({ error: `Avatar upload failed: ${avatarUploadErr.message}` }, 500);
    profileUpdates.avatar_path = avatarPath;
  }

  if (body.bannerContent && body.bannerFileName) {
    const bannerBytes = Uint8Array.from(atob(body.bannerContent as string), (c) =>
      c.charCodeAt(0),
    );
    const bannerPath = `${user.id}/profile/banner_${body.bannerFileName}`;
    await supabase.storage.from("storefront-assets").remove([bannerPath]);
    const { error: bannerUploadErr } = await supabase.storage
      .from("storefront-assets")
      .upload(bannerPath, bannerBytes, {
        contentType: (body.bannerMimeType as string) ?? "image/png",
      });
    if (bannerUploadErr)
      return json({ error: `Banner upload failed: ${bannerUploadErr.message}` }, 500);
    profileUpdates.banner_path = bannerPath;
  }

  if (Object.keys(profileUpdates).length === 0)
    return json({ error: "Nothing to update" }, 400);

  const { data: updatedProfile, error: profileUpdateErr } = await supabase
    .from("profiles")
    .update(profileUpdates)
    .eq("id", user.id)
    .select()
    .single();

  if (profileUpdateErr) return json({ error: profileUpdateErr.message }, 500);

  updatedProfile.avatar_url = updatedProfile.avatar_path
    ? publicUrl("storefront-assets", updatedProfile.avatar_path)
    : null;
  updatedProfile.banner_url = updatedProfile.banner_path
    ? publicUrl("storefront-assets", updatedProfile.banner_path)
    : null;

  return json(updatedProfile);
}

// POST get-profile
export async function getProfile(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const profileSlug = body.slug as string;
  const profileId = body.profileId as string;

  let profileQuery = supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_path, banner_path, website, twitter, telegram, farcaster, theme, slug, follower_count, following_count",
    );
  if (profileSlug)
    profileQuery = profileQuery.or(`slug.eq.${profileSlug},username.eq.${profileSlug}`);
  else if (profileId) profileQuery = profileQuery.eq("id", profileId);
  else profileQuery = profileQuery.eq("id", user.id);

  const { data: fetchedProfile, error: profileFetchErr } = await profileQuery.maybeSingle();
  if (profileFetchErr || !fetchedProfile) return json({ error: "Profile not found" }, 404);

  fetchedProfile.avatar_url = fetchedProfile.avatar_path
    ? publicUrl("storefront-assets", fetchedProfile.avatar_path)
    : null;
  fetchedProfile.banner_url = fetchedProfile.banner_path
    ? publicUrl("storefront-assets", fetchedProfile.banner_path)
    : null;

  return json(fetchedProfile);
}
