import type { Route } from "./+types/login";
import { LoginForm } from "~/features/auth/components/login-form";
import { getOptionalSession } from "~/features/auth/server/auth.server";
import { redirect } from "react-router";

export const meta: Route.MetaFunction = () => [
	{ title: "Log in — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { user, headers } = await getOptionalSession(request, context);
	if (user) throw redirect("/dashboard/links", { headers });
	return null;
};

export default function LoginRoute() {
	return <LoginForm />;
}
