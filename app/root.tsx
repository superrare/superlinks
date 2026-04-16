import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { getEnv, type PublicEnv } from "./lib/env.server";
import { Toaster } from "./components/ui/sonner";
import "./app.css";

export const loader = ({ context }: Route.LoaderArgs) => {
	return { ENV: getEnv(context) };
};

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "preconnect",
		href: "https://api.fontshare.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" type="image/png" href="/favicon.png" />
				<Meta />
				<Links />
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								var theme = localStorage.getItem('superlinks-theme');
								if (theme === 'dark') document.documentElement.classList.add('dark');
							})();
						`,
					}}
				/>
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<Outlet />
			<Toaster />
			<script
				dangerouslySetInnerHTML={{
					__html: `window.ENV = ${JSON.stringify(loaderData.ENV)};`,
				}}
			/>
		</>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="flex min-h-screen items-center justify-center p-4">
			<div className="text-center">
				<h1 className="text-4xl font-bold" style={{ color: "var(--text)" }}>
					{message}
				</h1>
				<p className="mt-2" style={{ color: "var(--text-secondary)" }}>
					{details}
				</p>
				{stack && (
					<pre className="mt-4 w-full max-w-2xl overflow-x-auto rounded-lg p-4 text-left text-sm" style={{ background: "var(--bg-surface)" }}>
						<code>{stack}</code>
					</pre>
				)}
			</div>
		</main>
	);
}
