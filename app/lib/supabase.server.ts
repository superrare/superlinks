import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { AppLoadContext } from "react-router";
import { getEnv } from "./env.server";

export const createSupabaseServerClient = (
	request: Request,
	context: AppLoadContext,
) => {
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const headers = new Headers();

	const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return parseCookieHeader(request.headers.get("Cookie") ?? "");
			},
			setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
				for (const { name, value, options } of cookiesToSet) {
					headers.append(
						"Set-Cookie",
						serializeCookieHeader(name, value, options),
					);
				}
			},
		},
	});

	return { supabase, headers };
};
