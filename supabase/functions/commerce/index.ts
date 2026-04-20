// Supabase edge-function code uses 2-space indentation (Deno convention).
// This file is the thin router. All business logic lives in ./handlers/*.
import { corsHeaders, json, getUser } from "../_shared/utils.ts";
import type { GetHandlerCtx, PostHandlerCtx } from "../_shared/types.ts";
import * as profiles from "./handlers/profiles.ts";
import * as storefronts from "./handlers/storefronts.ts";
import * as products from "./handlers/products.ts";
import * as apps from "./handlers/apps.ts";
import * as social from "./handlers/social.ts";
import * as posts from "./handlers/posts.ts";
import * as messaging from "./handlers/messaging.ts";
import * as links from "./handlers/links.ts";
import * as analytics from "./handlers/analytics.ts";
import * as events from "./handlers/events.ts";
import * as admin from "./handlers/admin.ts";

// ─── GET route registry ───────────────────────────────────────────────────────
// O(1) lookup by the path segment immediately after /commerce/
const getRoutes: Record<string, (ctx: GetHandlerCtx) => Promise<Response>> = {
  og: profiles.handleOg,
  "check-username": profiles.handleCheckUsername,
  store: storefronts.handleStore,
  preview: products.handlePreview,
  content: products.handleContent,
  app: apps.handleAppServing,
};

// ─── POST action registry ─────────────────────────────────────────────────────
// O(1) lookup by the "action" field in the request body.
const postActions: Record<string, (ctx: PostHandlerCtx) => Promise<Response>> = {
  // Profiles
  "update-username": profiles.updateUsername,
  "update-profile": profiles.updateProfile,
  "get-profile": profiles.getProfile,

  // Storefronts
  "create-storefront": storefronts.createStorefront,
  "my-storefronts": storefronts.myStorefronts,
  "update-storefront": storefronts.updateStorefront,
  "get-storefront": storefronts.getStorefront,
  "list-storefronts": storefronts.listStorefronts,

  // Products
  "add-product": products.addProduct,
  "browse": products.browse,
  "my-products": products.myProducts,
  "buy": products.buy,
  "my-purchases": products.myPurchases,
  "unlist": products.unlist,
  "delete-product": products.deleteProduct,
  "edit-product": products.editProduct,

  // Apps
  "add-app": apps.addApp,
  "update-app": apps.updateApp,
  "grant-app-token": apps.grantAppToken,

  // Social
  "feed": social.feed,
  "follow": social.follow,
  "unfollow": social.unfollow,
  "followers": social.followers,
  "following": social.following,
  "is-following": social.isFollowing,

  // Posts & Comments
  "create-post": posts.createPost,
  "delete-post": posts.deletePost,
  "get-posts": posts.getPosts,
  "create-comment": posts.createComment,
  "get-comments": posts.getComments,
  "delete-comment": posts.deleteComment,

  // Messaging
  "send-message": messaging.sendMessage,
  "inbox": messaging.inbox,
  "get-conversation": messaging.getConversation,
  "search-users": messaging.searchUsers,

  // Links
  "add-link": links.addLink,
  "update-link": links.updateLink,
  "delete-link": links.deleteLink,
  "reorder-links": links.reorderLinks,
  "get-links": links.getLinks,

  // Analytics (auth'd)
  "link-analytics": analytics.linkAnalytics,
  "page-view-analytics": analytics.pageViewAnalytics,

  // Events
  "events": events.events,
  "mark-read": events.markRead,

  // Admin
  "admin-check": admin.adminCheck,
  "admin-users": admin.adminUsers,
};

// GET routes that must receive a non-empty `resourceId` (path param) to function.
const getRequiresResourceId = new Set(["og", "check-username", "store", "preview", "content", "app"]);

// Generic error payload for 5xx. Real error details stay in logs.
const INTERNAL_ERROR = { error: "Internal server error" };

function logError(event: string, ctx: Record<string, unknown>, err: unknown) {
  // Edge-function logs are plain text; a single-line JSON blob is easy to grep/filter.
  const payload = {
    event,
    ...ctx,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  };
  console.error(JSON.stringify(payload));
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const requestId =
    req.headers.get("x-request-id") ?? crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── GET routes ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const actionIdx = pathParts.indexOf("commerce");
    const subAction = pathParts[actionIdx + 1] ?? "";
    const resourceId = pathParts[actionIdx + 2] ?? "";

    const handler = getRoutes[subAction];
    if (!handler) return json({ error: "Not found" }, 404);
    if (getRequiresResourceId.has(subAction) && !resourceId) {
      return json({ error: `Missing resource id for /${subAction}` }, 400);
    }

    try {
      return await handler({ req, segments: pathParts, resourceId });
    } catch (err) {
      logError("commerce_get_error", { requestId, subAction, resourceId }, err);
      return json(INTERNAL_ERROR, 500);
    }
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── POST routes ──
  let action = "";
  try {
    const rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    action = (rawBody.action as string) ?? "";

    // Public (no-auth) actions
    if (action === "track-pageview") {
      return analytics.trackPageview({ body: rawBody });
    }
    if (action === "track-click") {
      return analytics.trackClick({ body: rawBody });
    }

    // All other actions require a user token
    const userToken = req.headers.get("x-user-token");
    if (!userToken) return json({ error: "Missing x-user-token header" }, 401);

    let userCtx;
    try {
      userCtx = await getUser(userToken);
    } catch (err) {
      // getUser throws on invalid/expired tokens — surface as 401, not 500.
      logError("commerce_auth_error", { requestId, action }, err);
      return json({ error: "Unauthorized" }, 401);
    }

    const ctx: PostHandlerCtx = {
      user: userCtx.user,
      supabase: userCtx.supabase,
      body: rawBody,
    };

    const handler = postActions[action];
    if (!handler) return json({ error: `Unknown action: ${action}` }, 400);

    return await handler(ctx);
  } catch (err) {
    logError("commerce_post_error", { requestId, action }, err);
    return json(INTERNAL_ERROR, 500);
  }
});
