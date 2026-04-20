import { Outlet } from "react-router";
import type { Route } from "./+types/dashboard-layout";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { SidebarNav } from "~/components/shared/sidebar-nav";

export const shouldRevalidate: Route.ShouldRevalidateFunction = () => false;

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { user, headers } = await requireAuth(request, context);
	return withHeaders(
		{
			user: {
				id: user.id,
				email: user.email,
				displayName:
					user.user_metadata?.full_name ??
					user.email?.split("@")[0],
				avatarUrl: user.user_metadata?.avatar_url ?? null,
			},
		},
		headers,
	);
};

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
	return (
		<div className="app-shell">
			<SidebarNav user={loaderData.user} />
			<main className="app-content">
				<Outlet />
			</main>
		</div>
	);
}
