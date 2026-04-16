import type { Route } from "./+types/dashboard-products";
import { requireAuth } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Products — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;

	const [storefronts, products] = await Promise.all([
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-storefronts" }),
		callCommerce({ supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: token, action: "my-products" }),
	]);

	return { storefronts, products, ENV: getEnv(context) };
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

	const result = await callCommerce({
		supabaseUrl: SUPABASE_URL,
		anonKey: SUPABASE_ANON_KEY,
		accessToken: token,
		action: intent,
		body,
	});

	return { ok: true, result };
};

export default function DashboardProductsRoute({ loaderData }: Route.ComponentProps) {
	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">Products</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Manage your digital products and posts.
			</p>
			{/* TODO: wire to store feature components */}
		</div>
	);
}
