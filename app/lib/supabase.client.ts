import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseBrowserClient = () => {
	if (client) return client;

	const env = (window as unknown as { ENV: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string } }).ENV;

	client = createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
	return client;
};
