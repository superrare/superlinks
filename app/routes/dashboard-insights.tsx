import type { Route } from "./+types/dashboard-insights";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { Separator } from "~/components/ui/separator";
import { useState, useEffect } from "react";

interface DailyView {
	date: string;
	count: number;
}

interface LinkRow {
	link_id?: string;
	id?: string;
	title?: string;
	url?: string;
	click_count?: number;
}

interface Analytics {
	totalViews: number;
	viewsToday: number;
	viewsThisWeek: number;
	dailyViews: DailyView[];
	links: LinkRow[];
}

export const meta: Route.MetaFunction = () => [
	{ title: "Insights — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	return withHeaders({ token: session?.access_token ?? "", ENV: getEnv(context) }, headers);
};

function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<div
			className="flex flex-col gap-1 rounded-xl border p-5"
			style={{ borderColor: "var(--border)", background: "var(--card)" }}
		>
			<span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>{label}</span>
			<span className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</span>
		</div>
	);
}

function InsightsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-3 gap-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-20 animate-pulse rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--muted)" }} />
				))}
			</div>
			<div className="h-20 animate-pulse rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--muted)" }} />
		</div>
	);
}

export default function DashboardInsightsRoute({ loaderData }: Route.ComponentProps) {
	const { token, ENV } = loaderData;
	const [analytics, setAnalytics] = useState<Analytics | null>(null);

	useEffect(() => {
		Promise.all([
			fetch(`${ENV.SUPABASE_URL}/functions/v1/commerce`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`, "x-user-token": token },
				body: JSON.stringify({ action: "page-view-analytics" }),
			}).then((r) => r.json()),
			fetch(`${ENV.SUPABASE_URL}/functions/v1/commerce`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`, "x-user-token": token },
				body: JSON.stringify({ action: "link-analytics" }),
			}).then((r) => r.json()),
		]).then(([pv, la]) => {
			setAnalytics({
				totalViews: pv.total_views ?? 0,
				viewsToday: pv.views_today ?? 0,
				viewsThisWeek: pv.views_this_week ?? 0,
				dailyViews: pv.daily ?? [],
				links: la.analytics ?? [],
			});
		});
	}, [token, ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY]);

	return (
		<div className="max-w-2xl">
			<h1 className="text-2xl font-bold tracking-tight">Insights</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Track page views and link clicks.
			</p>

			<Separator className="my-6" />

			{analytics === null ? (
				<InsightsSkeleton />
			) : (
				<>
					<section className="mb-8">
						<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Page Views</h2>
						<div className="grid grid-cols-3 gap-3">
							<StatCard label="All time" value={analytics.totalViews} />
							<StatCard label="This week" value={analytics.viewsThisWeek} />
							<StatCard label="Today" value={analytics.viewsToday} />
						</div>

						{analytics.dailyViews.length > 0 && (() => {
							const maxDaily = Math.max(...analytics.dailyViews.map((d) => d.count), 1);
							return (
								<div className="mt-4 flex items-end gap-1 rounded-xl border px-4 py-4" style={{ borderColor: "var(--border)", background: "var(--card)", height: "80px" }}>
									{analytics.dailyViews.map((d, i) => {
										const pct = Math.max((d.count / maxDaily) * 100, 4);
										return (
											<div key={d.date ?? i} className="group relative flex-1" style={{ height: "100%" }}>
												<div
													className="w-full rounded-sm transition-opacity group-hover:opacity-80"
													style={{ height: `${pct}%`, background: "var(--accent, #6366f1)", position: "absolute", bottom: 0 }}
													title={`${d.date}: ${d.count}`}
												/>
											</div>
										);
									})}
								</div>
							);
						})()}
					</section>

					<section>
						<h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Link Clicks</h2>
						{analytics.links.length === 0 ? (
							<p className="text-sm" style={{ color: "var(--text-secondary)" }}>No link click data yet.</p>
						) : (() => {
							const maxClicks = analytics.links.reduce((m, r) => Math.max(m, r.click_count ?? 0), 1);
							return (
								<div className="flex flex-col gap-2">
									{analytics.links.map((r, i) => {
										const clicks = r.click_count ?? 0;
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
							);
						})()}
					</section>
				</>
			)}
		</div>
	);
}
