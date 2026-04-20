// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json } from "../../_shared/utils.ts";
import type { PostHandlerCtx } from "../../_shared/types.ts";

// POST send-message
export async function sendMessage(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const recipientUsername = body.recipient as string;
  const content = body.content as string;
  if (!recipientUsername) return json({ error: "Missing 'recipient'" }, 400);
  if (!content?.trim()) return json({ error: "Missing 'content'" }, 400);
  if (content.length > 5000) return json({ error: "Message too long (max 5000 chars)" }, 400);

  const { data: recipient } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", recipientUsername)
    .single();

  if (!recipient) return json({ error: `User @${recipientUsername} not found` }, 404);
  if (recipient.id === user.id) return json({ error: "Cannot message yourself" }, 400);

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      recipient_id: recipient.id,
      encrypted_content: content,
      sender_public_key: "web",
    })
    .select()
    .single();

  if (msgErr) return json({ error: msgErr.message }, 500);
  return json(msg);
}

// POST inbox
export async function inbox(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const inboxLimit = Math.min((body.limit as number) ?? 30, 100);
  const { data: messages, error: inboxErr } = await supabase
    .from("messages")
    .select(
      "*, sender:profiles!messages_sender_id_fkey(id, username, display_name), recipient:profiles!messages_recipient_id_fkey(id, username, display_name)",
    )
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(inboxLimit);

  if (inboxErr) return json({ error: inboxErr.message }, 500);

  const convos: Record<string, { partner: any; lastMessage: any; unreadCount: number }> = {};
  for (const m of messages ?? []) {
    const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    const partner = m.sender_id === user.id ? m.recipient : m.sender;
    if (!convos[partnerId]) {
      convos[partnerId] = { partner, lastMessage: m, unreadCount: 0 };
    }
    if (!m.read && m.recipient_id === user.id) {
      convos[partnerId].unreadCount++;
    }
  }

  return json({ conversations: Object.values(convos), messages: messages ?? [] });
}

// POST get-conversation
export async function getConversation(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const partnerId = body.partnerId as string;
  if (!partnerId) return json({ error: "Missing 'partnerId'" }, 400);
  const convoLimit = Math.min((body.limit as number) ?? 50, 100);

  const { data: messages, error: convoErr } = await supabase
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(id, username, display_name)")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(convoLimit);

  if (convoErr) return json({ error: convoErr.message }, 500);

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("sender_id", partnerId)
    .eq("recipient_id", user.id)
    .eq("read", false);

  const { data: partner } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", partnerId)
    .single();

  return json({ messages: messages ?? [], partner });
}

// POST search-users
export async function searchUsers(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const query = body.query as string;
  if (!query?.trim()) return json({ error: "Missing 'query'" }, 400);

  const { data: users, error: searchErr } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .neq("id", user.id)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (searchErr) return json({ error: searchErr.message }, 500);
  return json({ users: users ?? [] });
}
