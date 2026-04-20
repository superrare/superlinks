// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json } from "../../_shared/utils.ts";
import { svcSupabase } from "../../_shared/supabase.ts";
import type { PostHandlerCtx, PublicCtx } from "../../_shared/types.ts";

// POST track-pageview (public, no auth)
export async function trackPageview(ctx: PublicCtx): Promise<Response> {
  const { body } = ctx;
  const storefrontId = (body.storefrontId as string) ?? null;
  const profileId = (body.profileId as string) ?? null;
  if (!storefrontId && !profileId)
    return json({ error: "Missing 'storefrontId' or 'profileId'" }, 400);

  await svcSupabase.from("page_views").insert({
    storefront_id: storefrontId,
    profile_id: profileId,
    referrer: (body.referrer as string) ?? null,
    user_agent: (body.userAgent as string) ?? null,
  });

  return json({ tracked: true });
}

// POST track-click (public, no auth)
export async function trackClick(ctx: PublicCtx): Promise<Response> {
  const { body } = ctx;
  const linkId = body.linkId as string;
  if (!linkId) return json({ error: "Missing 'linkId'" }, 400);

  const { data: link } = await svcSupabase
    .from("custom_links")
    .select("storefront_id, profile_id")
    .eq("id", linkId)
    .single();

  if (!link) return json({ error: "Link not found" }, 404);

  await svcSupabase.from("link_clicks").insert({
    link_id: linkId,
    storefront_id: link.storefront_id,
    profile_id: link.profile_id,
    referrer: (body.referrer as string) ?? null,
    user_agent: (body.userAgent as string) ?? null,
  });

  return json({ tracked: true });
}

// POST link-analytics (authenticated)
export async function linkAnalytics(ctx: PostHandlerCtx): Promise<Response> {
  const { user } = ctx;

  const { data: linksWithClicks } = await svcSupabase
    .from("custom_links")
    .select("id, title, url, icon, sort_order, active")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: true });

  const { data: clickCounts } = await svcSupabase
    .from("link_click_counts")
    .select("link_id, total_clicks, clicks_24h, clicks_7d, last_clicked_at")
    .in("link_id", (linksWithClicks ?? []).map((l: { id: string }) => l.id));

  const countsMap = new Map(
    (clickCounts ?? []).map((c: Record<string, unknown>) => [c.link_id, c]),
  );

  const analytics = (linksWithClicks ?? []).map((link: Record<string, unknown>) => {
    const counts = countsMap.get(link.id) as Record<string, unknown> | undefined;
    return {
      ...link,
      total_clicks: Number(counts?.total_clicks ?? 0),
      clicks_24h: Number(counts?.clicks_24h ?? 0),
      clicks_7d: Number(counts?.clicks_7d ?? 0),
      last_clicked_at: counts?.last_clicked_at ?? null,
    };
  });

  return json({ analytics });
}

// POST page-view-analytics (authenticated)
export async function pageViewAnalytics(ctx: PostHandlerCtx): Promise<Response> {
  const { user } = ctx;

  const { data: pvCounts } = await svcSupabase
    .from("page_view_counts")
    .select("total_views, views_24h, views_7d, last_viewed_at")
    .eq("profile_id", user.id)
    .single();

  return json({
    pageViews: {
      total_views: Number(pvCounts?.total_views ?? 0),
      views_24h: Number(pvCounts?.views_24h ?? 0),
      views_7d: Number(pvCounts?.views_7d ?? 0),
      last_viewed_at: pvCounts?.last_viewed_at ?? null,
    },
  });
}
