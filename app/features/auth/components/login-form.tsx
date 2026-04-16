import { Button } from "~/components/ui/button";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

const GoogleIcon = () => (
	<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
		<path
			fill="#4285F4"
			d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
		/>
		<path
			fill="#34A853"
			d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
		/>
		<path
			fill="#FBBC05"
			d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
		/>
		<path
			fill="#EA4335"
			d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z"
		/>
	</svg>
);

export const LoginForm = () => {
	const handleGoogleSignIn = async () => {
		const supabase = getSupabaseBrowserClient();
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		});
		if (error) console.error("Login error:", error.message);
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
					<h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
					<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
						New to SuperLinks.me?{" "}
						<a href="/signup" className="font-medium underline">
							Sign up
						</a>
					</p>
					<Button
						variant="outline"
						className="mt-6 w-full gap-3 py-6 text-base font-medium"
						onClick={handleGoogleSignIn}
					>
						<GoogleIcon />
						Sign in with Google
					</Button>
				</div>
			</div>
			<div
				className="hidden flex-1 items-center justify-center lg:flex"
				style={{ background: "var(--bg-surface)" }}
			>
				<div className="w-48 rounded-[2rem] border p-6 shadow-lg" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
					<div className="mx-auto mb-4 h-1.5 w-16 rounded-full" style={{ background: "var(--border)" }} />
					<div className="mx-auto mb-3 h-14 w-14 rounded-full" style={{ background: "linear-gradient(135deg, #333, #888)" }} />
					<div className="mx-auto mb-1 h-3 w-20 rounded" style={{ background: "var(--border)" }} />
					<div className="mx-auto mb-4 h-2 w-14 rounded" style={{ background: "var(--border-subtle)" }} />
					<div className="mb-2 h-8 rounded-full" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }} />
					<div className="mb-2 h-8 rounded-full" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }} />
					<div className="h-8 rounded-full" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }} />
				</div>
			</div>
		</div>
	);
};
