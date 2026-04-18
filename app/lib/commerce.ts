/**
 * Client-side commerce API fetch. Mirrors commerce.server.ts but runs in the browser.
 * The Supabase anon key is public by design — safe to use client-side.
 */
export async function commerceFetch<T = Record<string, unknown>>(
	env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string },
	token: string,
	action: string,
): Promise<T> {
	const res = await fetch(`${env.SUPABASE_URL}/functions/v1/commerce`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
			"x-user-token": token,
		},
		body: JSON.stringify({ action }),
	});
	if (!res.ok) throw new Error(`Commerce API error: ${res.status}`);
	return res.json();
}
