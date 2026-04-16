import { redirect, type AppLoadContext } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export const requireAuth = async (request: Request, context: AppLoadContext) => {
	const { supabase, headers } = createSupabaseServerClient(request, context);
	const { data: { session } } = await supabase.auth.getSession();

	if (!session) {
		throw redirect("/login", { headers });
	}

	return { session, supabase, headers };
};

export const getOptionalSession = async (
	request: Request,
	context: AppLoadContext,
) => {
	const { supabase, headers } = createSupabaseServerClient(request, context);
	const { data: { session } } = await supabase.auth.getSession();

	return { session, supabase, headers };
};
