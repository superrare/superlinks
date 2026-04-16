import type { Route } from "./+types/dashboard-admin";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session?.access_token ?? "";

	let isAdmin = false;
	let users: unknown[] = [];

	try {
		const check = await callCommerce<{ admin: boolean }>({
			supabaseUrl: SUPABASE_URL,
			anonKey: SUPABASE_ANON_KEY,
			accessToken: token,
			action: "admin-check",
		});
		isAdmin = check.admin;

		if (isAdmin) {
			const result = await callCommerce<{ users: unknown[] }>({
				supabaseUrl: SUPABASE_URL,
				anonKey: SUPABASE_ANON_KEY,
				accessToken: token,
				action: "admin-users",
			});
			users = result.users ?? [];
		}
	} catch (e) {
		console.warn("Admin check failed:", e);
	}

	return withHeaders({ isAdmin, users }, headers);
};

export default function DashboardAdminRoute({ loaderData }: Route.ComponentProps) {
	if (!loaderData.isAdmin) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Access Denied</h1>
					<p className="mt-2" style={{ color: "var(--text-secondary)" }}>
						You don&apos;t have admin privileges.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">Admin</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				{loaderData.users.length} registered users.
			</p>
		</div>
	);
}
