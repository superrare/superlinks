interface WalletCallOptions {
	supabaseUrl: string;
	anonKey: string;
	accessToken: string;
	action: string;
	body?: Record<string, unknown>;
}

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

	const data: Record<string, unknown> = await res.json();
	if (!res.ok) throw new Error((data.error as string) ?? `Wallet call failed (${res.status})`);
	return data as T;
};
