import type { AppLoadContext } from "react-router";

export interface PublicEnv {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
}

export const getEnv = (context: AppLoadContext): PublicEnv => {
	const env = context.cloudflare.env;

	if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
		throw new Error(
			"Missing required env vars: SUPABASE_URL and SUPABASE_ANON_KEY must be set in wrangler.jsonc vars or .dev.vars",
		);
	}

	return {
		SUPABASE_URL: env.SUPABASE_URL,
		SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
	};
};

export const getServerEnv = (context: AppLoadContext) => {
	const env = context.cloudflare.env;
	return {
		...getEnv(context),
		GIPHY_API_KEY: (env as unknown as Record<string, string>).GIPHY_API_KEY ?? "",
	};
};
