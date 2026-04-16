interface WalletCallOptions {
	supabaseUrl: string;
	anonKey: string;
	accessToken: string;
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

export const callWallet = async <T = unknown>({
	supabaseUrl,
	anonKey,
	accessToken,
	action,
	body = {},
}: WalletCallOptions): Promise<T> => {
	const res = await fetch(`${supabaseUrl}/functions/v1/wallet`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${anonKey}`,
			"x-user-token": accessToken,
		},
		body: JSON.stringify({ action, ...body }),
	});

	const data = await safeJson(res);
	if (!res.ok) throw new Error((data.error as string) ?? `Wallet call failed (${res.status})`);
	return data as T;
};
