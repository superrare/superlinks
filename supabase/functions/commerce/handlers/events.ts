// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json } from "../../_shared/utils.ts";
import type { PostHandlerCtx } from "../../_shared/types.ts";

// POST events
export async function events(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const unreadOnly = body.unreadOnly === true;

  let query = supabase
    .from("events")
    .select("*, profiles!events_actor_id_fkey(username, display_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) query = query.eq("read", false);

  const { data: eventsList, error: evErr } = await query;
  if (evErr) return json({ error: evErr.message }, 500);
  return json({ events: eventsList ?? [] });
}

// POST mark-read
export async function markRead(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const eventIds = body.eventIds as string[] | undefined;

  if (eventIds && eventIds.length > 0) {
    await supabase
      .from("events")
      .update({ read: true })
      .in("id", eventIds)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("events")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }

  return json({ marked: true });
}
