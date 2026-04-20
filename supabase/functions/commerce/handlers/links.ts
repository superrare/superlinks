// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json } from "../../_shared/utils.ts";
import type { PostHandlerCtx } from "../../_shared/types.ts";

// POST add-link
export async function addLink(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const linkTitle = body.title as string;
  const linkUrl = body.url as string;
  const linkIcon = (body.icon as string) ?? null;
  if (!linkTitle?.trim()) return json({ error: "Missing 'title'" }, 400);
  if (!linkUrl?.trim()) return json({ error: "Missing 'url'" }, 400);

  let resolvedSfId: string | null = (body.storefrontId as string) ?? null;
  if (!resolvedSfId) {
    const { data: ownedStores } = await supabase
      .from("storefronts")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);
    resolvedSfId = ownedStores?.[0]?.id ?? null;
  }

  const { data: maxRow } = await supabase
    .from("custom_links")
    .select("sort_order")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data: link, error: linkErr } = await supabase
    .from("custom_links")
    .insert({
      profile_id: user.id,
      storefront_id: resolvedSfId,
      title: linkTitle.trim(),
      url: linkUrl.trim(),
      icon: linkIcon,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (linkErr) return json({ error: linkErr.message }, 500);
  return json(link);
}

// POST update-link
export async function updateLink(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const updateLinkId = body.linkId as string;
  if (!updateLinkId) return json({ error: "Missing 'linkId'" }, 400);

  const { data: existingLink } = await supabase
    .from("custom_links")
    .select("id, profile_id")
    .eq("id", updateLinkId)
    .single();
  if (!existingLink) return json({ error: "Link not found" }, 404);
  if (existingLink.profile_id !== user.id) return json({ error: "Not your link" }, 403);

  const linkUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) linkUpdates.title = body.title;
  if (body.url !== undefined) linkUpdates.url = body.url;
  if (body.icon !== undefined) linkUpdates.icon = body.icon;
  if (body.active !== undefined) linkUpdates.active = body.active;
  if (body.sort_order !== undefined) linkUpdates.sort_order = body.sort_order;

  const { data: updatedLink, error: ulErr } = await supabase
    .from("custom_links")
    .update(linkUpdates)
    .eq("id", updateLinkId)
    .select()
    .single();
  if (ulErr) return json({ error: ulErr.message }, 500);
  return json(updatedLink);
}

// POST delete-link
export async function deleteLink(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const delLinkId = body.linkId as string;
  if (!delLinkId) return json({ error: "Missing 'linkId'" }, 400);

  const { data: delLink } = await supabase
    .from("custom_links")
    .select("profile_id")
    .eq("id", delLinkId)
    .single();
  if (!delLink) return json({ error: "Link not found" }, 404);
  if (delLink.profile_id !== user.id) return json({ error: "Not your link" }, 403);

  await supabase.from("custom_links").delete().eq("id", delLinkId);
  return json({ deleted: true });
}

// POST reorder-links
export async function reorderLinks(ctx: PostHandlerCtx): Promise<Response> {
  const { supabase, body } = ctx;
  const linkIds = body.linkIds as string[];
  if (!linkIds?.length) return json({ error: "Missing 'linkIds'" }, 400);

  for (let i = 0; i < linkIds.length; i++) {
    await supabase.from("custom_links").update({ sort_order: i }).eq("id", linkIds[i]);
  }
  return json({ reordered: true });
}

// POST get-links
export async function getLinks(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const getLinksProfileId = body.profileId as string;
  const getLinksStorefrontId = body.storefrontId as string;

  let linksQuery = supabase
    .from("custom_links")
    .select("*")
    .order("sort_order", { ascending: true });

  if (getLinksProfileId) {
    linksQuery = linksQuery.eq("profile_id", getLinksProfileId);
  } else if (getLinksStorefrontId) {
    linksQuery = linksQuery.eq("storefront_id", getLinksStorefrontId);
  } else {
    linksQuery = linksQuery.eq("profile_id", user.id);
  }

  const { data: links, error: glErr } = await linksQuery;
  if (glErr) return json({ error: glErr.message }, 500);
  return json({ links: links ?? [] });
}
