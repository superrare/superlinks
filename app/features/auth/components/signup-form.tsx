import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

interface SignupFormProps {
	prefilledUsername?: string;
	supabaseUrl: string;
	anonKey: string;
}

export const SignupForm = ({ prefilledUsername = "", supabaseUrl, anonKey }: SignupFormProps) => {
	const [username, setUsername] = useState(prefilledUsername);
	const [checkState, setCheckState] = useState<"" | "available" | "unavailable" | "checking">("");
	const [checkMessage, setCheckMessage] = useState("");
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const checkUsername = useCallback(
		async (value: string) => {
			if (value.length < 3) {
				setCheckState("");
				setCheckMessage("");
				return;
			}
			if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
				setCheckState("unavailable");
				setCheckMessage("Letters, numbers, hyphens, underscores only");
				return;
			}
			setCheckState("checking");
			setCheckMessage("...");
			try {
				const res = await fetch(
					`${supabaseUrl}/functions/v1/commerce/check-username/${encodeURIComponent(value)}`,
					{ headers: { Authorization: `Bearer ${anonKey}` } },
				);
				const data: Record<string, unknown> = await res.json();
				setCheckState(data.available ? "available" : "unavailable");
				setCheckMessage(data.available ? "Available!" : (data.reason as string) || "Already taken");
			} catch {
				setCheckState("");
				setCheckMessage("");
			}
		},
		[supabaseUrl, anonKey],
	);

	useEffect(() => {
		if (prefilledUsername) void checkUsername(prefilledUsername);
	}, [prefilledUsername, checkUsername]);

	const handleUsernameChange = (value: string) => {
		setUsername(value);
		clearTimeout(timerRef.current);
		if (!value.trim()) {
			setCheckState("");
			setCheckMessage("");
			return;
		}
		timerRef.current = setTimeout(() => checkUsername(value.trim()), 400);
	};

	const handleGoogleSignUp = async () => {
		const supabase = getSupabaseBrowserClient();
		const trimmed = username.trim();
		const callbackUrl = new URL("/auth/callback", window.location.origin);
		if (trimmed) callbackUrl.searchParams.set("claimed_username", trimmed);

		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: callbackUrl.toString() },
		});
		if (error) console.error("Signup error:", error.message);
	};

	return (
		<div className="flex min-h-screen">
			<div className="flex flex-1 items-center justify-center p-8">
				<div className="w-full max-w-sm">
					<a
						href="/"
						className="mb-8 flex items-center gap-2 text-xl font-extrabold tracking-tight"
					>
						<span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--accent)] text-sm font-black text-[var(--accent-text)]">
							S
						</span>
						SuperLinks.me
					</a>
					<h1 className="text-2xl font-bold tracking-tight">Claim your page</h1>
					<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
						Sign up for free. Already have an account?{" "}
						<a href="/login" className="font-medium underline">
							Log in
						</a>
					</p>

					<div className="mt-6">
						<div
							className="flex items-center overflow-hidden rounded-[14px] border transition-colors focus-within:border-[var(--text)]"
							style={{
								background: "var(--bg-elevated)",
								borderColor: checkState === "available" ? "var(--success)" : checkState === "unavailable" ? "var(--danger)" : "var(--border)",
							}}
						>
							<span className="whitespace-nowrap pl-4 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
								superlinks.me/
							</span>
							<Input
								className="border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
								placeholder="username"
								autoComplete="off"
								spellCheck={false}
								value={username}
								onChange={(e) => handleUsernameChange(e.target.value)}
							/>
						</div>
						{checkMessage && (
							<p
								className="mt-1 text-xs font-medium"
								style={{ color: checkState === "available" ? "var(--success)" : checkState === "unavailable" ? "var(--danger)" : "var(--text-secondary)" }}
							>
								{checkMessage}
							</p>
						)}
					</div>

					<Button
						variant="outline"
						className="mt-4 w-full gap-3 py-6 text-base font-medium"
						onClick={handleGoogleSignUp}
					>
						<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
							<path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
							<path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
							<path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
							<path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" />
						</svg>
						Sign up with Google
					</Button>

					<p className="mt-4 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
						By signing up, you agree to our Terms of Service and Privacy Policy.
					</p>
				</div>
			</div>
			<div
				className="hidden flex-1 items-center justify-center lg:flex"
				style={{ background: "var(--bg-surface)" }}
			>
				<div className="max-w-xs text-center">
					<p className="text-lg font-medium italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>
						&ldquo;SuperLinks.me made it seamless for me to monetize and share everything with my audience.&rdquo;
					</p>
					<span className="mt-4 block text-sm font-semibold" style={{ color: "var(--text-tertiary)" }}>
						— Early creator
					</span>
				</div>
			</div>
		</div>
	);
};
