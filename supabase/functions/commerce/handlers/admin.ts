// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json } from "../../_shared/utils.ts";
import type { PostHandlerCtx } from "../../_shared/types.ts";

// POST admin-check
export async function adminCheck(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase } = ctx;
  const { data: adm } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("email", user.email ?? "")
    .maybeSingle();
  return json({ isAdmin: !!adm });
}

// POST admin-users
export async function adminUsers(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase } = ctx;

  const { data: adm } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("email", user.email ?? "")
    .maybeSingle();
  if (!adm) return json({ error: "Forbidden" }, 403);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, email, created_at, follower_count")
    .order("created_at", { ascending: false });

  const {
    data: { users: authUsers },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  const { data: storefronts } = await supabase
    .from("storefronts")
    .select("id, owner_id, slug");

  const { data: pvCounts } = await supabase
    .from("page_view_counts")
    .select("storefront_id, total_views, views_24h, views_7d");

  const authMap = new Map((authUsers ?? []).map((u: any) => [u.id, u]));
  const storeMap = new Map((storefronts ?? []).map((s: any) => [s.owner_id, s]));
  const pvMap = new Map((pvCounts ?? []).map((p: any) => [p.storefront_id, p]));

  const users = (profiles ?? []).map((p: any) => {
    const auth = authMap.get(p.id) as any;
    const store = storeMap.get(p.id) as any;
    const pv = store ? (pvMap.get(store.id) as any) : null;
    return {
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      email: p.email,
      created_at: p.created_at,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      storefront_slug: p.username ?? store?.slug ?? null,
      follower_count: p.follower_count ?? 0,
      page_views_total: Number(pv?.total_views ?? 0),
      page_views_24h: Number(pv?.views_24h ?? 0),
      page_views_7d: Number(pv?.views_7d ?? 0),
    };
  });

  return json({ users });
}
