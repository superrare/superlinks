import type { ComponentProps } from "react";
import type { Route } from "./+types/dashboard-links";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { commerceFetch } from "~/lib/commerce";
import { invalidateCache } from "~/lib/cache.server";
import { EditorLayout } from "~/features/editor/components/editor-layout";
import { useState, useEffect } from "react";

export const meta: Route.MetaFunction = () => [
	{ title: "My Links — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	return withHeaders({ token: session?.access_token ?? "", ENV: getEnv(context) }, headers);
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

	const body: Record<string, unknown> = {};
	for (const [key, value] of formData.entries()) {
		if (key !== "intent") body[key] = value;
	}

	if (body.theme && typeof body.theme === "string") {
		try {
			body.theme = JSON.parse(body.theme);
		} catch (e) {
			console.warn("Invalid theme JSON:", e);
		}
	}

	const result = await callCommerce({
		supabaseUrl: SUPABASE_URL,
		anonKey: SUPABASE_ANON_KEY,
		accessToken: token,
		action: intent,
		body,
	});

	if (intent === "update-profile" || intent === "update-username" || intent === "update-link" || intent === "reorder-links") {
		const storefronts = await callCommerce<{ storefronts?: Array<{ slug: string }> }>({
			supabaseUrl: SUPABASE_URL,
			anonKey: SUPABASE_ANON_KEY,
			accessToken: token,
			action: "my-storefronts",
		});
		const slug = storefronts.storefronts?.[0]?.slug;
		if (slug) {
			const pageUrl = new URL(`/${slug}`, request.url).toString();
			await invalidateCache(pageUrl);
		}
	}

	return withHeaders({ ok: true, result }, headers);
};

// Derive the data shape directly from EditorLayout's props so this stays in sync automatically.
type EditorData = Omit<ComponentProps<typeof EditorLayout>["data"], "ENV">;

function EditorSkeleton() {
	return (
		<div className="max-w-2xl space-y-6 animate-pulse">
			<div className="h-8 w-48 rounded-lg" style={{ background: "var(--muted)" }} />
			<div className="h-24 rounded-xl" style={{ background: "var(--muted)" }} />
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-14 rounded-xl" style={{ background: "var(--muted)" }} />
				))}
			</div>
		</div>
	);
}

export default function DashboardLinksRoute({ loaderData }: Route.ComponentProps) {
	const [editorData, setEditorData] = useState<EditorData | null>(null);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		const { token, ENV } = loaderData;
		let cancelled = false;
		setLoadError(false);

		Promise.all([
			commerceFetch(ENV, token, "my-storefronts"),
			commerceFetch(ENV, token, "get-profile"),
			commerceFetch(ENV, token, "get-links"),
		])
			.then(([storefronts, profile, links]) => {
				if (!cancelled) setEditorData({ storefronts, profile, links } as EditorData);
			})
			.catch(() => {
				if (!cancelled) setLoadError(true);
			});

		return () => { cancelled = true; };
		// loaderData is a new reference after every navigation and after every action
		// revalidation, so this effect re-runs to sync server state after saves.
	}, [loaderData]);

	if (loadError) {
		return (
			<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
				Failed to load.{" "}
				<button className="underline" onClick={() => window.location.reload()}>
					Refresh
				</button>
			</p>
		);
	}

	if (!editorData) return <EditorSkeleton />;

	return <EditorLayout data={{ ...editorData, ENV: loaderData.ENV }} />;
}
