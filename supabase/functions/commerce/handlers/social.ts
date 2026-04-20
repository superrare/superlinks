// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json } from "../../_shared/utils.ts";
import type { PostHandlerCtx } from "../../_shared/types.ts";

// POST feed
export async function feed(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const feedLimit = Math.min((body.limit as number) ?? 20, 50);

  const { data: feedFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (feedFollowing ?? []).map((f: { following_id: string }) => f.following_id);

  if (followingIds.length === 0) return json({ posts: [] });

  const { data: feedPosts, error: feedErr } = await supabase
    .from("posts")
    .select(
      "*, profiles!posts_author_id_fkey(username, display_name), storefronts!inner(name, slug)",
    )
    .in("author_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(feedLimit);

  if (feedErr) return json({ error: feedErr.message }, 500);

  const { publicUrl } = await import("../../_shared/utils.ts");
  const feedWithMedia = (feedPosts ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    media_url: p.media_path
      ? publicUrl(supabase, "commerce-previews", p.media_path as string)
      : null,
  }));

  return json({ posts: feedWithMedia });
}

// POST follow
export async function follow(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const targetId = body.targetId as string;
  if (!targetId) return json({ error: "Missing 'targetId'" }, 400);
  if (targetId === user.id) return json({ error: "Cannot follow yourself" }, 400);

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", targetId)
    .single();
  if (!targetProfile) return json({ error: "User not found" }, 404);

  const { error: followErr } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });

  if (followErr) {
    if (followErr.code === "23505") return json({ error: "Already following" }, 409);
    return json({ error: followErr.message }, 500);
  }

  await supabase.from("events").insert({
    user_id: targetId,
    actor_id: user.id,
    type: "follow",
    payload: {},
  });

  return json({ followed: true, targetId });
}

// POST unfollow
export async function unfollow(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const unfollowTargetId = body.targetId as string;
  if (!unfollowTargetId) return json({ error: "Missing 'targetId'" }, 400);

  const { error: unfollowErr } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", unfollowTargetId);

  if (unfollowErr) return json({ error: unfollowErr.message }, 500);
  return json({ unfollowed: true, targetId: unfollowTargetId });
}

// POST followers
export async function followers(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const ofUserId = (body.userId as string) ?? user.id;
  const { data: followersList, error: fErr } = await supabase
    .from("follows")
    .select("follower_id, profiles!follows_follower_id_fkey(id, username, display_name)")
    .eq("following_id", ofUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (fErr) return json({ error: fErr.message }, 500);
  return json({ followers: followersList ?? [] });
}

// POST following
export async function following(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const followingOfUserId = (body.userId as string) ?? user.id;
  const { data: followingList, error: fgErr } = await supabase
    .from("follows")
    .select("following_id, profiles!follows_following_id_fkey(id, username, display_name)")
    .eq("follower_id", followingOfUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (fgErr) return json({ error: fgErr.message }, 500);
  return json({ following: followingList ?? [] });
}

// POST is-following
export async function isFollowing(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const checkTargetId = body.targetId as string;
  if (!checkTargetId) return json({ error: "Missing 'targetId'" }, 400);

  const { data: exists } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", checkTargetId)
    .limit(1)
    .single();

  return json({ isFollowing: !!exists });
}
