import type { Route } from "./+types/dashboard-earn";
import { requireAuth } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { callWallet } from "~/lib/wallet.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Earn — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;

	const [balance, transactions, events, purchases, storefronts] = await Promise.all([
		callWallet({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "balance" }).catch(() => null),
		callWallet({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "transactions" }).catch(() => null),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "events" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-purchases" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-storefronts" }),
	]);

	return { balance, transactions, events, purchases, storefronts, ENV: getEnv(context) };
};

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;
	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "send") {
		const result = await callWallet({
			supabaseUrl: SUPABASE_URL,
			anonKey: SUPABASE_ANON_KEY,
			accessToken: token,
			action: "send",
			body: {
				to: formData.get("to") as string,
				amount: formData.get("amount") as string,
				asset: formData.get("asset") as string,
			},
		});
		return { ok: true, result };
	}

	if (intent === "mark-read") {
		await callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "mark-read" });
		return { ok: true };
	}

	return { ok: false, error: "Unknown intent" };
};

export default function DashboardEarnRoute({ loaderData }: Route.ComponentProps) {
	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">Earn</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Your wallet, transactions, and notifications.
			</p>
			{/* TODO: wire to wallet feature components */}
		</div>
	);
}
