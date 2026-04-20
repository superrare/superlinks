import { redirect, data, type AppLoadContext } from "react-router";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "~/lib/supabase.server";

/**
 * Dev-only auth bypass for Playwright visual diff tests.
 * Guarded by both `import.meta.env.DEV` (build-time, tree-shaken in prod)
 * and runtime env vars so it can never activate in production.
 */
const getBypassSession = (context: AppLoadContext): { user: User; session: Session } | null => {
	if (!import.meta.env.DEV) return null;

	const env = context.cloudflare.env as Record<string, string>;
	if (env.AUTH_BYPASS !== "1" || !env.AUTH_BYPASS_USER_ID) return null;

	const fakeUser = {
		id: env.AUTH_BYPASS_USER_ID,
		email: "bypass@test.local",
		role: "authenticated",
		aud: "authenticated",
		app_metadata: { provider: "google" },
		user_metadata: { full_name: "Test User", avatar_url: null },
		created_at: "2024-01-01T00:00:00.000Z",
	} as unknown as User;

	const fakeSession = {
		access_token: "bypass-token",
		refresh_token: "bypass-refresh",
		expires_in: 3600,
		token_type: "bearer",
		user: fakeUser,
	} as Session;

	return { user: fakeUser, session: fakeSession };
};

export const requireAuth = async (request: Request, context: AppLoadContext) => {
	const { supabase, headers } = createSupabaseServerClient(request, context);

	// getSession() decodes the JWT from the cookie locally (~1ms) rather than calling
	// Supabase's auth server like getUser() does (~100-500ms). Tradeoff: revoked tokens
	// remain valid until they naturally expire (up to 1h). Acceptable for a dashboard.
	const { data: { session } } = await supabase.auth.getSession();

	if (session?.user) {
		return { user: session.user, session, supabase, headers };
	}

	const bypass = getBypassSession(context);
	if (bypass) return { ...bypass, supabase, headers };

	throw redirect("/login", { headers });
};

export const getOptionalSession = async (
	request: Request,
	context: AppLoadContext,
) => {
	const { supabase, headers } = createSupabaseServerClient(request, context);
	const { data: { user } } = await supabase.auth.getUser();
	const { data: { session } } = await supabase.auth.getSession();

	return { user, session, supabase, headers };
};

export const withHeaders = <T extends Record<string, unknown>>(
	payload: T,
	headers: Headers,
) => data(payload, { headers });
