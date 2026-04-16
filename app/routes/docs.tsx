import type { Route } from "./+types/docs";
import { Button } from "~/components/ui/button";

export const meta: Route.MetaFunction = () => [
	{ title: "Docs — SuperLinks.me" },
	{ name: "description", content: "SuperLinks.me CLI and API documentation." },
];

export default function DocsRoute() {
	return (
		<div style={{ background: "var(--bg)" }}>
			{/* Nav */}
			<div className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ background: "oklch(0.985 0.002 250 / 0.85)", borderColor: "var(--border-subtle)" }}>
				<nav className="container-max flex items-center justify-between py-5">
					<a href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
						<span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--accent)] text-sm font-black text-[var(--accent-text)]">S</span>
						SuperLinks.me
					</a>
					<div className="flex items-center gap-4">
						<a href="/" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)]">Home</a>
						<a href="/docs" className="text-sm font-semibold">Docs</a>
						<Button size="sm" asChild><a href="/login">Log in</a></Button>
					</div>
				</nav>
			</div>

			<div className="container-max grid gap-12 py-12 lg:grid-cols-[240px_1fr]">
				{/* Sidebar */}
				<aside className="hidden lg:block">
					<nav className="sticky top-24 space-y-1">
						{[
							"Installation",
							"Quick Start",
							"Authentication",
							"Wallet",
							"Store",
							"Links",
							"Social",
							"MCP Server",
							"Configuration",
							"Environment",
						].map((item) => (
							<a
								key={item}
								href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
								className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--text)]"
							>
								{item}
							</a>
						))}
					</nav>
				</aside>

				{/* Content */}
				<main className="min-w-0">
					<h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
					<p className="mt-2 text-lg" style={{ color: "var(--text-secondary)" }}>
						Everything you need to build with SuperLinks.me — CLI, API, and MCP server.
					</p>

					<section id="installation" className="mt-12">
						<h2 className="text-xl font-semibold">Installation</h2>
						<CodeBlock code="npm install -g @superlinks/cli" />
					</section>

					<section id="quick-start" className="mt-12">
						<h2 className="text-xl font-semibold">Quick Start</h2>
						<CodeBlock code={`# Login with Google\nsuperlinks login --provider google\n\n# Set up your profile\nsuperlinks profile update --name "Your Name" --bio "Creator"\n\n# Add a link\nsuperlinks link add "My Website" https://example.com`} />
					</section>

					<section id="authentication" className="mt-12">
						<h2 className="text-xl font-semibold">Authentication</h2>
						<p className="mt-2" style={{ color: "var(--text-secondary)" }}>
							Authenticate with Google OAuth to get started. Your session is stored locally and used for all subsequent commands.
						</p>
						<CodeBlock code={`superlinks login --provider google`} />
					</section>

					<section id="wallet" className="mt-12">
						<h2 className="text-xl font-semibold">Wallet</h2>
						<p className="mt-2" style={{ color: "var(--text-secondary)" }}>
							Every account gets a Coinbase-managed wallet on Base for receiving payments.
						</p>
						<div className="mt-4 space-y-2">
							<CommandCard command="superlinks wallet balance" description="Get ETH and USDC balance" />
							<CommandCard command="superlinks wallet send" description="Send ETH or USDC to a recipient" />
						</div>
					</section>

					<section id="store" className="mt-12">
						<h2 className="text-xl font-semibold">Store</h2>
						<p className="mt-2" style={{ color: "var(--text-secondary)" }}>
							Create a storefront and list digital products for sale.
						</p>
						<div className="mt-4 space-y-2">
							<CommandCard command="superlinks store create <name>" description="Create a storefront" />
							<CommandCard command='superlinks store add <file> -t "Title" -p 5.00' description="Upload a product" />
							<CommandCard command="superlinks store list" description="List your products" />
							<CommandCard command="superlinks store browse" description="Browse all active products" />
						</div>
					</section>

					<section id="links" className="mt-12">
						<h2 className="text-xl font-semibold">Links</h2>
						<div className="mt-4 space-y-2">
							<CommandCard command="superlinks link add <title> <url>" description="Add a custom link" />
							<CommandCard command="superlinks link list" description="List custom links" />
							<CommandCard command="superlinks link remove <id>" description="Remove a custom link" />
							<CommandCard command="superlinks link analytics" description="View click analytics" />
						</div>
					</section>

					<section id="mcp-server" className="mt-12">
						<h2 className="text-xl font-semibold">MCP Server</h2>
						<p className="mt-2" style={{ color: "var(--text-secondary)" }}>
							SuperLinks exposes its functionality as an MCP (Model Context Protocol) server for AI agents.
						</p>
						<CodeBlock code="superlinks serve-mcp" />
					</section>

					<section id="environment" className="mt-12">
						<h2 className="text-xl font-semibold">Environment Variables</h2>
						<div className="mt-4 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
							<table className="w-full text-sm">
								<thead>
									<tr style={{ background: "var(--bg-surface)" }}>
										<th className="px-4 py-2 text-left font-semibold">Variable</th>
										<th className="px-4 py-2 text-left font-semibold">Description</th>
									</tr>
								</thead>
								<tbody>
									{[
										["SUPABASE_URL", "Supabase project URL"],
										["SUPABASE_ANON_KEY", "Supabase anonymous key"],
									].map(([name, desc]) => (
										<tr key={name} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
											<td className="px-4 py-2 font-mono text-xs">{name}</td>
											<td className="px-4 py-2">{desc}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}

const CodeBlock = ({ code }: { code: string }) => (
	<pre className="mt-4 overflow-x-auto rounded-2xl p-5 text-sm leading-relaxed" style={{ background: "#111", color: "#e5e5e5" }}>
		<code>{code}</code>
	</pre>
);

const CommandCard = ({ command, description }: { command: string; description: string }) => (
	<div className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
		<code className="text-sm font-medium">{command}</code>
		<span className="text-sm" style={{ color: "var(--text-secondary)" }}>{description}</span>
	</div>
);
