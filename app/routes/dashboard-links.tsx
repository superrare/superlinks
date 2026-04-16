import type { Route } from "./+types/dashboard-links";
import { requireAuth } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { invalidateCache } from "~/lib/cache.server";
import { EditorLayout } from "~/features/editor/components/editor-layout";

export const meta: Route.MetaFunction = () => [
	{ title: "My Links — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;

	const [storefronts, profile, links] = await Promise.all([
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-storefronts" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "get-profile" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "get-links" }),
	]);

	return { storefronts, profile, links, ENV: getEnv(context) };
};

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;
	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	const body: Record<string, unknown> = {};
	for (const [key, value] of formData.entries()) {
		if (key !== "intent") body[key] = value;
	}

	if (body.theme && typeof body.theme === "string") {
		try { body.theme = JSON.parse(body.theme); } catch {}
	}

	const result = await callCommerce({
		supabaseUrl: SUPABASE_URL,
		anonKey: SUPABASE_ANON_KEY,
		accessToken: token,
		action: intent,
		body,
	});

	if (intent === "update-profile" || intent === "update-link" || intent === "reorder-links") {
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

	return { ok: true, result };
};

export default function DashboardLinksRoute({ loaderData }: Route.ComponentProps) {
	return <EditorLayout data={loaderData} />;
}
