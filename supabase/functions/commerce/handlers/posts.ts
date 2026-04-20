// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json, publicUrl } from "../../_shared/utils.ts";
import type { PostHandlerCtx } from "../../_shared/types.ts";

// POST create-post
export async function createPost(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const postContent = body.content as string;
  const mediaContent = body.mediaContent as string | undefined;
  const mediaFileName = body.mediaFileName as string | undefined;
  const mediaMimeType = body.mediaMimeType as string | undefined;

  if (!postContent?.trim() && !mediaContent)
    return json({ error: "Missing 'content' or media" }, 400);
  if (postContent && postContent.length > 2000)
    return json({ error: "Post too long (max 2000 chars)" }, 400);

  let resolvedStorefrontId: string | null = (body.storefrontId as string) ?? null;
  if (!resolvedStorefrontId) {
    const { data: ownedStores } = await supabase
      .from("storefronts")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);
    resolvedStorefrontId = ownedStores?.[0]?.id ?? null;
  }

  let mediaPath: string | null = null;
  let mediaType: string | null = null;
  if (mediaContent && mediaFileName && mediaMimeType) {
    const mediaBytes = Uint8Array.from(atob(mediaContent), (c) => c.charCodeAt(0));
    if (mediaBytes.length > 10 * 1024 * 1024)
      return json({ error: "Media too large (max 10MB)" }, 400);

    if (mediaMimeType.startsWith("image/")) mediaType = "image";
    else if (mediaMimeType.startsWith("video/")) mediaType = "video";
    else if (mediaMimeType.startsWith("audio/")) mediaType = "audio";
    else return json({ error: "Unsupported media type. Use image, video, or audio." }, 400);

    mediaPath = `${user.id}/${crypto.randomUUID()}/${mediaFileName}`;
    const { error: mediaUploadErr } = await supabase.storage
      .from("commerce-previews")
      .upload(mediaPath, mediaBytes, { contentType: mediaMimeType });
    if (mediaUploadErr)
      return json({ error: `Media upload failed: ${mediaUploadErr.message}` }, 500);
  }

  const { data: post, error: postErr } = await supabase
    .from("posts")
    .insert({
      profile_id: user.id,
      storefront_id: resolvedStorefrontId,
      author_id: user.id,
      content: (postContent ?? "").trim(),
      media_path: mediaPath,
      media_type: mediaType,
    })
    .select()
    .single();

  if (postErr) return json({ error: postErr.message }, 500);

  const mediaUrl = post.media_path
    ? publicUrl(supabase, "commerce-previews", post.media_path)
    : null;

  const { data: postFollowers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", user.id);

  if (postFollowers && postFollowers.length > 0) {
    const eventRows = postFollowers.map((f: { follower_id: string }) => ({
      user_id: f.follower_id,
      actor_id: user.id,
      type: "new_product" as const,
      payload: {
        type: "post",
        postId: post.id,
        preview: (postContent ?? "").trim().slice(0, 100),
      },
    }));
    await supabase.from("events").insert(eventRows);
  }

  return json({ ...post, media_url: mediaUrl });
}

// POST delete-post
export async function deletePost(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const deletePostId = body.postId as string;
  if (!deletePostId) return json({ error: "Missing 'postId'" }, 400);

  const { error: delErr } = await supabase
    .from("posts")
    .delete()
    .eq("id", deletePostId)
    .eq("author_id", user.id);

  if (delErr) return json({ error: delErr.message }, 500);
  return json({ deleted: true });
}

// POST get-posts
export async function getPosts(ctx: PostHandlerCtx): Promise<Response> {
  const { supabase, body } = ctx;
  const postsStorefrontId = body.storefrontId as string;
  const postsProfileId = body.profileId as string;
  const postsLimit = Math.min((body.limit as number) ?? 20, 50);

  let postsQuery = supabase
    .from("posts")
    .select("*, profiles!posts_author_id_fkey(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(postsLimit);

  if (postsProfileId) {
    postsQuery = postsQuery.eq("profile_id", postsProfileId);
  } else if (postsStorefrontId) {
    postsQuery = postsQuery.eq("storefront_id", postsStorefrontId);
  }

  const { data: posts, error: postsErr } = await postsQuery;
  if (postsErr) return json({ error: postsErr.message }, 500);

  const postsWithMedia = (posts ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    media_url: p.media_path
      ? publicUrl(supabase, "commerce-previews", p.media_path as string)
      : null,
  }));

  return json({ posts: postsWithMedia });
}

// POST create-comment
export async function createComment(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const commentPostId = body.postId as string;
  const commentContent = body.content as string;
  if (!commentPostId) return json({ error: "Missing 'postId'" }, 400);
  if (!commentContent?.trim()) return json({ error: "Missing 'content'" }, 400);
  if (commentContent.length > 1000)
    return json({ error: "Comment too long (max 1000 chars)" }, 400);

  const { data: comment, error: commentErr } = await supabase
    .from("comments")
    .insert({
      post_id: commentPostId,
      author_id: user.id,
      content: commentContent.trim(),
    })
    .select("*, profiles!comments_author_id_fkey(username, display_name)")
    .single();

  if (commentErr) return json({ error: commentErr.message }, 500);
  return json(comment);
}

// POST get-comments
export async function getComments(ctx: PostHandlerCtx): Promise<Response> {
  const { supabase, body } = ctx;
  const commentsPostId = body.postId as string;
  if (!commentsPostId) return json({ error: "Missing 'postId'" }, 400);

  const { data: comments, error: commentsErr } = await supabase
    .from("comments")
    .select("*, profiles!comments_author_id_fkey(username, display_name)")
    .eq("post_id", commentsPostId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (commentsErr) return json({ error: commentsErr.message }, 500);
  return json({ comments: comments ?? [] });
}

// POST delete-comment
export async function deleteComment(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const deleteCommentId = body.commentId as string;
  if (!deleteCommentId) return json({ error: "Missing 'commentId'" }, 400);

  const { error: delCommentErr } = await supabase
    .from("comments")
    .delete()
    .eq("id", deleteCommentId)
    .eq("author_id", user.id);

  if (delCommentErr) return json({ error: delCommentErr.message }, 500);
  return json({ deleted: true });
}
