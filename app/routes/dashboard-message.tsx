import type { Route } from "./+types/dashboard-message";
import { requireAuth } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Conversation — SuperLinks.me" },
];

export const loader = async ({ request, context, params }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;

	const conversation = await callCommerce({
		supabaseUrl: SUPABASE_URL,
		anonKey: SUPABASE_ANON_KEY,
		accessToken: token,
		action: "get-conversation",
		body: { partnerId: params.partnerId },
	});

	return { conversation, partnerId: params.partnerId, ENV: getEnv(context) };
};

export default function DashboardMessageRoute({ loaderData }: Route.ComponentProps) {
	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">Conversation</h1>
			{/* TODO: wire to chat-view component with Supabase Realtime */}
		</div>
	);
}
