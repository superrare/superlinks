import { redirect } from "react-router";
import type { Route } from "./+types/auth-callback";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { callWallet } from "~/lib/wallet.server";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const claimedUsername = url.searchParams.get("claimed_username");

	if (!code) throw redirect("/login");

	const { supabase, headers } = createSupabaseServerClient(request, context);
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		console.error("Auth callback error:", error.message);
		throw redirect("/login");
	}

	const { data: { session } } = await supabase.auth.getSession();
	if (!session) throw redirect("/login");

	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session.access_token;

	try {
		await callWallet({
			supabaseUrl: SUPABASE_URL,
			anonKey: SUPABASE_ANON_KEY,
			accessToken: token,
			action: "create",
		});
	} catch { /* wallet may already exist */ }

	const storeName =
		claimedUsername ||
		session.user.user_metadata?.full_name ||
		session.user.email?.split("@")[0] ||
		"My Store";

	try {
		await callCommerce({
			supabaseUrl: SUPABASE_URL,
			anonKey: SUPABASE_ANON_KEY,
			accessToken: token,
			action: "create-storefront",
			body: { name: storeName },
		});
	} catch { /* storefront may already exist */ }

	throw redirect("/dashboard/links", { headers });
};
