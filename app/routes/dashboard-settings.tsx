import { useState } from "react";
import type { Route } from "./+types/dashboard-settings";
import { requireAuth } from "~/features/auth/server/auth.server";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

export const meta: Route.MetaFunction = () => [
	{ title: "Settings — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	return { email: session.user.email ?? "" };
};

export default function DashboardSettingsRoute({ loaderData }: Route.ComponentProps) {
	const [theme, setTheme] = useState(() => {
		if (typeof document === "undefined") return "light";
		return document.documentElement.classList.contains("dark") ? "dark" : "light";
	});

	const handleToggleTheme = () => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		document.documentElement.classList.toggle("dark", next === "dark");
		localStorage.setItem("superlinks-theme", next);
	};

	const handleLogout = async () => {
		const supabase = getSupabaseBrowserClient();
		await supabase.auth.signOut();
		window.location.href = "/";
	};

	return (
		<div className="max-w-lg">
			<h1 className="text-2xl font-bold tracking-tight">Settings</h1>

			<div className="mt-8">
				<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
					Account
				</h2>
				<div className="mt-3 flex items-center justify-between">
					<span className="text-sm" style={{ color: "var(--text-secondary)" }}>Email</span>
					<span className="text-sm font-medium">{loaderData.email}</span>
				</div>
			</div>

			<Separator className="my-6" />

			<div>
				<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
					Appearance
				</h2>
				<div className="mt-3 flex items-center justify-between">
					<span className="text-sm" style={{ color: "var(--text-secondary)" }}>Theme</span>
					<Button variant="outline" size="sm" onClick={handleToggleTheme}>
						{theme === "dark" ? "☀️ Light" : "🌙 Dark"}
					</Button>
				</div>
			</div>

			<Separator className="my-6" />

			<Button
				variant="outline"
				className="text-[var(--danger)] border-[var(--danger)]"
				onClick={handleLogout}
			>
				Log out
			</Button>
		</div>
	);
}
