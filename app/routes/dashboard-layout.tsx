import { Outlet } from "react-router";
import type { Route } from "./+types/dashboard-layout";
import { requireAuth } from "~/features/auth/server/auth.server";
import { SidebarNav } from "~/components/shared/sidebar-nav";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	return {
		user: {
			email: session.user.email,
			displayName:
				session.user.user_metadata?.full_name ??
				session.user.email?.split("@")[0],
			avatarUrl: session.user.user_metadata?.avatar_url ?? null,
		},
	};
};

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
	return (
		<div className="app-shell">
			<SidebarNav user={loaderData.user} />
			<main className="app-content p-6 pt-16 md:p-8 md:pt-8">
				<Outlet />
			</main>
		</div>
	);
}
