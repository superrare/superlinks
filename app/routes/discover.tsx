import type { Route } from "./+types/discover";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { Button } from "~/components/ui/button";

export const meta: Route.MetaFunction = () => [
	{ title: "Discover — SuperLinks.me" },
	{ name: "description", content: "Browse creators on SuperLinks.me" },
];

export const loader = async ({ context }: Route.LoaderArgs) => {
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);

	let storefronts: unknown[] = [];
	try {
		const result = await callCommerce<{ storefronts: unknown[] }>({
			supabaseUrl: SUPABASE_URL,
			anonKey: SUPABASE_ANON_KEY,
			action: "list-storefronts",
		});
		storefronts = result.storefronts ?? [];
	} catch (e) {
		console.warn("Failed to load storefronts:", e);
	}

	return { storefronts };
};

export default function DiscoverRoute({ loaderData }: Route.ComponentProps) {
	const { storefronts } = loaderData;

	return (
		<div style={{ background: "var(--bg)" }}>
			<div className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ background: "oklch(0.985 0.002 250 / 0.85)", borderColor: "var(--border-subtle)" }}>
				<nav className="container-max flex items-center justify-between py-5">
					<a href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
						<span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--accent)] text-sm font-black text-[var(--accent-text)]">S</span>
						SuperLinks.me
					</a>
					<Button size="sm" asChild><a href="/signup">Sign up free</a></Button>
				</nav>
			</div>

			<div className="container-max py-12">
				<h1 className="text-3xl font-bold tracking-tight">Find creators on SuperLinks.me</h1>
				<p className="mt-2 text-lg" style={{ color: "var(--text-secondary)" }}>
					Discover creators, explore their pages, and support their work.
				</p>

				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{(storefronts as any[]).map((store: any) => (
						<a
							key={store.id ?? store.slug}
							href={`/${store.slug}`}
							className="group rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
							style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
						>
							<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-extrabold text-[var(--accent-text)]">
								{(store.name ?? store.slug ?? "?").charAt(0).toUpperCase()}
							</div>
							<div className="text-base font-semibold group-hover:underline">
								{store.name ?? store.slug}
							</div>
							<div className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
								@{store.slug}
							</div>
							{store.bio && (
								<p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
									{store.bio}
								</p>
							)}
						</a>
					))}
				</div>

				{storefronts.length === 0 && (
					<div className="mt-16 text-center">
						<p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>No creators yet.</p>
						<Button className="mt-4" asChild><a href="/signup">Be the first</a></Button>
					</div>
				)}
			</div>
		</div>
	);
}
