import type { SupabaseClient } from "@supabase/supabase-js";

interface CommerceCallOptions {
	supabaseUrl: string;
	anonKey: string;
	accessToken?: string;
	action: string;
	body?: Record<string, unknown>;
}

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

	const data: Record<string, unknown> = await res.json();
	if (!res.ok) throw new Error((data.error as string) ?? `Commerce call failed (${res.status})`);
	return data as T;
};

export const fetchStore = async (supabaseUrl: string, anonKey: string, slug: string) => {
	const res = await fetch(`${supabaseUrl}/functions/v1/commerce/store/${slug}`, {
		headers: { Authorization: `Bearer ${anonKey}` },
	});
	const data: Record<string, unknown> = await res.json();
	if (!res.ok) throw new Error((data.error as string) ?? "Store not found");
	return data;
};

export const checkUsername = async (supabaseUrl: string, anonKey: string, username: string) => {
	const res = await fetch(
		`${supabaseUrl}/functions/v1/commerce/check-username/${encodeURIComponent(username)}`,
		{ headers: { Authorization: `Bearer ${anonKey}` } },
	);
	return res.json() as Promise<Record<string, unknown>>;
};
