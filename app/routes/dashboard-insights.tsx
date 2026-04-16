import type { Route } from "./+types/dashboard-insights";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";

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
	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">Insights</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Track page views and link clicks.
			</p>
		</div>
	);
}
