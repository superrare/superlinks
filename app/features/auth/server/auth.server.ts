import { redirect, data, type AppLoadContext } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export const requireAuth = async (request: Request, context: AppLoadContext) => {
	const { supabase, headers } = createSupabaseServerClient(request, context);
	const { data: { session } } = await supabase.auth.getSession();

	if (!session?.user) {
		throw redirect("/login", { headers });
	}

	return { user: session.user, session, supabase, headers };
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
