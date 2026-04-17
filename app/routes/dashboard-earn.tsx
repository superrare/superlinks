import { useFetcher } from "react-router";
import type { Route } from "./+types/dashboard-earn";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { callWallet } from "~/lib/wallet.server";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";

export const meta: Route.MetaFunction = () => [
	{ title: "Earn — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session?.access_token ?? "";

	const [balance, transactions, events, purchases, storefronts] = await Promise.all([
		callWallet({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "balance" }).catch((e) => { console.warn("Wallet balance error:", e); return null; }),
		callWallet({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "transactions" }).catch((e) => { console.warn("Wallet transactions error:", e); return null; }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "events" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-purchases" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-storefronts" }),
	]);

	return withHeaders({ balance, transactions, events, purchases, storefronts, ENV: getEnv(context) }, headers);
};

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session?.access_token ?? "";
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (!intent || typeof intent !== "string") {
		return withHeaders({ ok: false, error: "Missing intent" }, headers);
	}

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
		return withHeaders({ ok: true, result }, headers);
	}

	if (intent === "mark-read") {
		await callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "mark-read" });
		return withHeaders({ ok: true }, headers);
	}

	return withHeaders({ ok: false, error: "Unknown intent" }, headers);
};

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardEarnRoute({ loaderData }: Route.ComponentProps) {
	const fetcher = useFetcher();
	const data = loaderData as any;
	const balance = data?.balance as Record<string, unknown> | null;
	const transactions = ((data?.transactions?.transactions ?? data?.transactions ?? []) as any[]);
	const events = ((data?.events?.events ?? data?.events ?? []) as any[]);
	const purchases = ((data?.purchases?.purchases ?? data?.purchases ?? []) as any[]);
	const unreadCount = events.filter((e: any) => !e.read).length;

	return (
		<div className="max-w-2xl">
			<h1 className="text-2xl font-bold tracking-tight">Earn</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Your wallet, transactions, and notifications.
			</p>

			<Separator className="my-6" />

			{/* Wallet Balance */}
			<section className="mb-8">
				<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Wallet</h2>
				{balance ? (
					<div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
						<div className="text-3xl font-bold tabular-nums">
							{(balance.usdc ?? balance.balance ?? "0.00") as string}
							<span className="ml-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>USDC</span>
						</div>
						{balance.address && (
							<p className="mt-1 truncate font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
								{balance.address as string}
							</p>
						)}
					</div>
				) : (
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>Wallet unavailable.</p>
				)}
			</section>

			{/* Notifications / Events */}
			<section className="mb-8">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
						Notifications {unreadCount > 0 && <span className="ml-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] text-white">{unreadCount}</span>}
					</h2>
					{unreadCount > 0 && (
						<fetcher.Form method="post">
							<input type="hidden" name="intent" value="mark-read" />
							<Button type="submit" variant="ghost" size="sm" className="text-xs">
								Mark all read
							</Button>
						</fetcher.Form>
					)}
				</div>
				{events.length === 0 ? (
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>No notifications yet.</p>
				) : (
					<div className="flex flex-col gap-2">
						{events.map((e: any) => (
							<div
								key={e.id}
								className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
								style={{ borderColor: "var(--border)", background: e.read ? "var(--card)" : "var(--card-highlight, var(--card))", opacity: e.read ? 0.7 : 1 }}
							>
								<span className="mt-0.5 shrink-0 text-base">{e.type === "purchase" ? "💰" : e.type === "follow" ? "👤" : "🔔"}</span>
								<span className="flex-1">{e.message ?? e.body ?? e.type}</span>
								{e.created_at && (
									<span className="shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>{timeAgo(e.created_at)}</span>
								)}
							</div>
						))}
					</div>
				)}
			</section>

			{/* Recent Transactions */}
			<section className="mb-8">
				<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Transactions</h2>
				{transactions.length === 0 ? (
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>No transactions yet.</p>
				) : (
					<div className="flex flex-col gap-2">
						{transactions.map((tx: any) => (
							<div
								key={tx.id ?? tx.hash}
								className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
								style={{ borderColor: "var(--border)", background: "var(--card)" }}
							>
								<span className="text-base">{tx.type === "receive" || tx.type === "credit" ? "⬇️" : "⬆️"}</span>
								<span className="flex-1 font-medium capitalize">{tx.type ?? "Transfer"}</span>
								<span className="shrink-0 font-mono font-semibold">
									{tx.amount} {tx.asset ?? "USDC"}
								</span>
								{tx.created_at && (
									<span className="shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>{timeAgo(tx.created_at)}</span>
								)}
							</div>
						))}
					</div>
				)}
			</section>

			{/* Purchases */}
			<section>
				<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>My Purchases</h2>
				{purchases.length === 0 ? (
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>No purchases yet.</p>
				) : (
					<div className="flex flex-col gap-2">
						{purchases.map((p: any) => (
							<div
								key={p.id}
								className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
								style={{ borderColor: "var(--border)", background: "var(--card)" }}
							>
								<span className="text-base">📦</span>
								<span className="flex-1 font-medium truncate">{p.title ?? p.product_title ?? p.product_id}</span>
								<span className="shrink-0 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
									{p.price ? `${p.price} USDC` : ""}
								</span>
								{p.created_at && (
									<span className="shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>{timeAgo(p.created_at)}</span>
								)}
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
