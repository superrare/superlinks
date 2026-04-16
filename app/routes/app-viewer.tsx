import type { Route } from "./+types/app-viewer";
import { getEnv } from "~/lib/env.server";
import { getOptionalSession } from "~/features/auth/server/auth.server";

export const meta: Route.MetaFunction = () => [
	{ title: "App — SuperLinks.me" },
];

export const loader = async ({ params, request, context }: Route.LoaderArgs) => {
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const { session } = await getOptionalSession(request, context);

	const appId = params.id;
	let appUrl: string | null = null;
	let error: string | null = null;

	try {
		const res = await fetch(`${SUPABASE_URL}/functions/v1/commerce/app/${appId}/`, {
			headers: {
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
				...(session ? { "x-user-token": session.access_token } : {}),
			},
		});

		if (res.status === 402) {
			error = "This app requires a purchase to access.";
		} else if (!res.ok) {
			error = "App not found.";
		} else {
			appUrl = res.url;
		}
	} catch {
		error = "Failed to load app.";
	}

	return { appUrl, error, appId };
};

export default function AppViewerRoute({ loaderData }: Route.ComponentProps) {
	const { appUrl, error } = loaderData;

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center" style={{ background: "#0a0a0a", color: "#a3a3a3" }}>
				<div className="text-center">
					<h1 className="text-xl font-semibold text-white">{error}</h1>
					<a href="/" className="mt-4 inline-block text-sm underline">Go to SuperLinks.me</a>
				</div>
			</div>
		);
	}

	if (!appUrl) return null;

	return (
		<iframe
			src={appUrl}
			className="h-screen w-screen border-0"
			title="App"
			sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
		/>
	);
}
