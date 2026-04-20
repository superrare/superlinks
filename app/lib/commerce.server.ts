interface CommerceCallOptions {
	supabaseUrl: string;
	anonKey: string;
	accessToken?: string;
	action: string;
	body?: Record<string, unknown>;
}

const safeJson = async (res: Response): Promise<Record<string, unknown>> => {
	const text = await res.text();
	try {
		return JSON.parse(text) as Record<string, unknown>;
	} catch {
		return { error: `Non-JSON response (${res.status}): ${text.slice(0, 200)}` };
	}
};

export const callCommerce = async <T = unknown>({
	supabaseUrl,
	anonKey,
	accessToken,
	action,
	body = {},
}: CommerceCallOptions): Promise<T> => {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${anonKey}`,
	};

	if (accessToken) {
		headers["x-user-token"] = accessToken;
	}

	const res = await fetch(`${supabaseUrl}/functions/v1/commerce`, {
		method: "POST",
		headers,
		body: JSON.stringify({ action, ...body }),
	});

	const data = await safeJson(res);
	if (!res.ok) throw new Error((data.error as string) ?? `Commerce call failed (${res.status})`);
	return data as T;
};

export const fetchStore = async (supabaseUrl: string, anonKey: string, slug: string) => {
	const res = await fetch(`${supabaseUrl}/functions/v1/commerce/store/${slug}`, {
		headers: { Authorization: `Bearer ${anonKey}` },
	});
	const data = await safeJson(res);
	if (!res.ok) throw new Error((data.error as string) ?? "Store not found");
	return data;
};

/**
 * Safety-net: directly query the Supabase REST `products` table if the
 * edge function returns an empty product list for a storefront we know exists.
 *
 * Motivation: the edge function was originally shipped with a `.single()` bug
 * on the storefront lookup. That has been fixed, but we retain this fallback
 * for one release cycle so a regression in the edge function doesn't take
 * every creator page offline with no graceful path.
 *
 * Remove after the modularized commerce function has been verified stable in
 * production (see migration PR).
 */
export const fetchProductsFallback = async (
	supabaseUrl: string,
	anonKey: string,
	storefrontId: string,
): Promise<Record<string, unknown>[]> => {
	try {
		const url =
			`${supabaseUrl}/rest/v1/products` +
			`?select=id,title,description,price,content_type,preview_path,created_at,metadata` +
			`&storefront_id=eq.${encodeURIComponent(storefrontId)}` +
			`&status=eq.active` +
			`&order=created_at.desc`;
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${anonKey}`,
				apikey: anonKey,
			},
		});
		if (!res.ok) return [];
		const rows = (await res.json()) as Record<string, unknown>[];
		return rows.map((p) => ({
			...p,
			preview_url: p.preview_path
				? `${supabaseUrl}/storage/v1/object/public/commerce-previews/` +
					String(p.preview_path)
						.split("/")
						.map(encodeURIComponent)
						.join("/")
				: null,
		}));
	} catch {
		return [];
	}
};

export const checkUsername = async (supabaseUrl: string, anonKey: string, username: string) => {
	const res = await fetch(
		`${supabaseUrl}/functions/v1/commerce/check-username/${encodeURIComponent(username)}`,
		{ headers: { Authorization: `Bearer ${anonKey}` } },
	);
	return safeJson(res);
};
