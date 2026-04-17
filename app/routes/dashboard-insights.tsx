import type { Route } from "./+types/dashboard-insights";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { Separator } from "~/components/ui/separator";

export const meta: Route.MetaFunction = () => [
	{ title: "Insights — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session?.access_token ?? "";

	const [storefronts, linkAnalytics, pageViewAnalytics] = await Promise.all([
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-storefronts" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "link-analytics" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "page-view-analytics" }),
	]);

	return withHeaders({ storefronts, linkAnalytics, pageViewAnalytics }, headers);
};

export default function DashboardInsightsRoute({ loaderData }: Route.ComponentProps) {
	const data = loaderData as any;
	const pv = data?.pageViewAnalytics as Record<string, unknown> | null | undefined;
	const la = data?.linkAnalytics as Record<string, unknown> | null | undefined;

	const totalViews = (pv?.total_views ?? pv?.total ?? 0) as number;
	const viewsToday = (pv?.views_today ?? pv?.today ?? 0) as number;
	const viewsThisWeek = (pv?.views_this_week ?? pv?.this_week ?? 0) as number;
	const dailyViews = ((pv?.daily ?? pv?.views ?? []) as Array<{ date: string; count: number }>);

	const linkRows = ((la?.analytics ?? la?.links ?? la?.data ?? []) as Array<{
		link_id?: string;
		id?: string;
		title?: string;
		url?: string;
		click_count?: number;
		clicks?: number;
	}>);

	const maxClicks = linkRows.reduce((m, r) => Math.max(m, r.click_count ?? r.clicks ?? 0), 1);

	const statCard = (label: string, value: number) => (
		<div
			className="flex flex-col gap-1 rounded-xl border p-5"
			style={{ borderColor: "var(--border)", background: "var(--card)" }}
		>
			<span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>{label}</span>
			<span className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</span>
		</div>
	);

	return (
		<div className="max-w-2xl">
			<h1 className="text-2xl font-bold tracking-tight">Insights</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Track page views and link clicks.
			</p>

			<Separator className="my-6" />

			{/* Page view stats */}
			<section className="mb-8">
				<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Page Views</h2>
				<div className="grid grid-cols-3 gap-3">
					{statCard("All time", totalViews)}
					{statCard("This week", viewsThisWeek)}
					{statCard("Today", viewsToday)}
				</div>

				{/* Daily sparkline */}
				{dailyViews.length > 0 && (
					<div className="mt-4 flex items-end gap-1 rounded-xl border px-4 py-4" style={{ borderColor: "var(--border)", background: "var(--card)", height: "80px" }}>
						{dailyViews.map((d, i) => {
							const max = Math.max(...dailyViews.map((x) => x.count), 1);
							const pct = Math.max((d.count / max) * 100, 4);
							return (
								<div key={d.date ?? i} className="group relative flex-1" style={{ height: "100%" }}>
									<div
										className="w-full rounded-sm transition-opacity group-hover:opacity-80"
										style={{ height: `${pct}%`, background: "var(--accent, #6366f1)", marginTop: "auto", position: "absolute", bottom: 0 }}
										title={`${d.date}: ${d.count}`}
									/>
								</div>
							);
						})}
					</div>
				)}
			</section>

			{/* Link clicks */}
			<section>
				<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Link Clicks</h2>
				{linkRows.length === 0 ? (
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>No link click data yet.</p>
				) : (
					<div className="flex flex-col gap-2">
						{linkRows.map((r, i) => {
							const clicks = r.click_count ?? r.clicks ?? 0;
							const barPct = (clicks / maxClicks) * 100;
							const id = r.link_id ?? r.id ?? String(i);
							return (
								<div
									key={id}
									className="relative overflow-hidden rounded-xl border px-4 py-3 text-sm"
									style={{ borderColor: "var(--border)", background: "var(--card)" }}
								>
									<div
										className="pointer-events-none absolute inset-y-0 left-0 rounded-xl opacity-10"
										style={{ width: `${barPct}%`, background: "var(--accent, #6366f1)" }}
									/>
									<div className="relative flex items-center gap-3">
										<span className="flex-1 truncate font-medium">{r.title ?? r.url ?? id}</span>
										{r.url && r.title && (
											<span className="hidden truncate text-xs sm:block" style={{ color: "var(--text-secondary)", maxWidth: "160px" }}>{r.url}</span>
										)}
										<span className="shrink-0 font-mono font-semibold">{clicks.toLocaleString()}</span>
										<span className="shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>clicks</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
