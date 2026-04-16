import type { Route } from "./+types/signup";
import { SignupForm } from "~/features/auth/components/signup-form";
import { getOptionalSession } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { redirect } from "react-router";

export const meta: Route.MetaFunction = () => [
	{ title: "Sign up — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session } = await getOptionalSession(request, context);
	if (session) throw redirect("/dashboard/links");

	const url = new URL(request.url);
	const username = url.searchParams.get("username") ?? "";
	const env = getEnv(context);
	return { username, ...env };
};

export default function SignupRoute({ loaderData }: Route.ComponentProps) {
	return (
		<SignupForm
			prefilledUsername={loaderData.username}
			supabaseUrl={loaderData.SUPABASE_URL}
			anonKey={loaderData.SUPABASE_ANON_KEY}
		/>
	);
}
