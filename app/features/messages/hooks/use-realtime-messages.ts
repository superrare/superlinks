import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

interface Message {
	id: string;
	sender_id: string;
	receiver_id: string;
	content: string;
	created_at: string;
}

export const useRealtimeMessages = (partnerId: string, userId: string) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null>(null);

	useEffect(() => {
		const supabase = getSupabaseBrowserClient();

		const channel = supabase
			.channel(`messages:${[userId, partnerId].sort().join("-")}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId}))`,
				},
				(payload) => {
					const newMsg = payload.new as Message;
					setMessages((prev) => [...prev, newMsg]);
				},
			)
			.subscribe();

		channelRef.current = channel;

		return () => {
			supabase.removeChannel(channel);
		};
	}, [partnerId, userId]);

	const sendMessage = useCallback(
		async (content: string) => {
			const supabase = getSupabaseBrowserClient();
			const { error } = await supabase.from("messages").insert({
				sender_id: userId,
				receiver_id: partnerId,
				content,
			});
			if (error) throw error;
		},
		[userId, partnerId],
	);

	return { messages, setMessages, sendMessage };
};
