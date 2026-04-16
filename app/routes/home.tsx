import type { Route } from "./+types/home";
import { getOptionalSession } from "~/features/auth/server/auth.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { useState } from "react";
import { MenuIcon } from "lucide-react";

export const meta: Route.MetaFunction = () => [
	{ title: "SuperLinks.me — Everything your fans need, all in one place" },
	{ name: "description", content: "The all-in-one link-in-bio for creators. Share links, sell products, and grow your audience." },
	{ property: "og:title", content: "SuperLinks.me — Everything your fans need, all in one place" },
	{ property: "og:description", content: "The all-in-one link-in-bio for creators. Share links, sell products, and grow your audience." },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { user } = await getOptionalSession(request, context);
	return { isLoggedIn: !!user };
};

export default function HomePage({ loaderData }: Route.ComponentProps) {
	const { isLoggedIn } = loaderData;

	return (
		<div style={{ background: "var(--bg)" }}>
			{/* Nav */}
			<div className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ background: "oklch(0.985 0.002 250 / 0.85)", borderColor: "var(--border-subtle)" }}>
				<nav className="container-max flex items-center justify-between py-5">
					<a href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
						<span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--accent)] text-sm font-black text-[var(--accent-text)]">S</span>
						SuperLinks
					</a>
					<div className="hidden items-center gap-8 md:flex">
						<a href="#audience" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)]">Audience</a>
						<a href="#monetize" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)]">Monetize</a>
						<a href="#analytics" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)]">Analytics</a>
						<a href="/docs" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)]">Docs</a>
					</div>
					<div className="flex items-center gap-3">
						{isLoggedIn ? (
							<Button asChild><a href="/dashboard/links">Dashboard</a></Button>
						) : (
							<>
								<a href="/login" className="hidden px-4 py-2 text-sm font-semibold sm:inline">Log in</a>
								<Button asChild className="hidden sm:inline-flex"><a href="/signup">Sign up free</a></Button>
							</>
						)}
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
									<MenuIcon className="h-5 w-5" />
								</Button>
							</SheetTrigger>
							<SheetContent side="right" className="w-64 p-6">
								<nav className="mt-8 flex flex-col gap-4">
									<a href="#audience" className="text-base font-medium">Audience</a>
									<a href="#monetize" className="text-base font-medium">Monetize</a>
									<a href="#analytics" className="text-base font-medium">Analytics</a>
									<a href="/docs" className="text-base font-medium">Docs</a>
									<hr className="my-2" style={{ borderColor: "var(--border)" }} />
									{isLoggedIn ? (
										<a href="/dashboard/links" className="text-base font-semibold">Dashboard</a>
									) : (
										<>
											<a href="/login" className="text-base font-medium">Log in</a>
											<Button asChild><a href="/signup">Sign up free</a></Button>
										</>
									)}
								</nav>
							</SheetContent>
						</Sheet>
					</div>
				</nav>
			</div>

			{/* Hero */}
			<section className="container-max grid items-center gap-20 py-24 lg:grid-cols-2 lg:py-28">
				<div>
					<h1 className="text-4xl font-semibold leading-[1.1] tracking-tight lg:text-[3.5rem]">
						The single destination for everything you build.
					</h1>
					<p className="mt-6 max-w-lg text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
						One link to rule them all. Integrate your shop, your portfolio, and your community into a single, high-performance landing page.
					</p>
					<ClaimInput className="mt-9" />
				</div>
				<div className="hidden justify-center lg:flex">
					<PhoneMockup />
				</div>
			</section>

			{/* Sections */}
			<Section id="audience" label="Audience" title="Grow your audience and own your data." description="Build your following across every platform from a single hub. Export your audience data at any time — you always own your relationships.">
				<div className="text-center">
					<div className="mb-4 flex items-end justify-center gap-2">
						{[40, 60, 50, 80, 70, 100, 90, 130].map((h, i) => (
							<div key={i} className="w-8 rounded-t-lg" style={{ height: `${h}px`, background: "var(--text)", opacity: i === 7 ? 1 : i % 2 === 0 ? 0.25 : 0.15 }} />
						))}
					</div>
					<div className="text-3xl font-semibold tracking-tight">12,847</div>
					<div className="text-sm" style={{ color: "var(--text-secondary)" }}>followers this month</div>
				</div>
			</Section>

			<Section id="monetize" label="Monetize" title="Sell products and services directly." description="List digital products, accept payments in USDC, and manage everything through our dashboard or APIs. No middleman, instant settlement." reverse bg>
				<div className="grid grid-cols-2 gap-4">
					{[
						{ icon: "📦", title: "Digital Products", desc: "PDFs, videos, templates" },
						{ icon: "💰", title: "USDC Payments", desc: "Instant crypto settlement" },
						{ icon: "🏪", title: "Storefronts", desc: "Your own branded store" },
						{ icon: "📊", title: "Dashboard", desc: "Or manage via API" },
					].map((item) => (
						<div key={item.title} className="rounded-3xl border p-6 text-center shadow-sm" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
							<div className="mb-2 text-2xl">{item.icon}</div>
							<div className="text-sm font-semibold">{item.title}</div>
							<div className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.desc}</div>
						</div>
					))}
				</div>
			</Section>

			<Section id="analytics" label="Analytics" title="Understand your audience at a glance." description="Track clicks, streams, and purchases in real time. See what's working and make data-driven decisions.">
				<div className="grid grid-cols-2 gap-4">
					{[
						{ value: "43,500", label: "Clicks" },
						{ value: "643", label: "Track Plays" },
						{ value: "$2,362", label: "Sales" },
						{ value: "960", label: "Visits" },
					].map((stat) => (
						<div key={stat.label} className="rounded-3xl border p-5 text-center shadow-sm" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
							<div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
							<div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{stat.label}</div>
						</div>
					))}
				</div>
			</Section>

			{/* CTA */}
			<section className="container-max pb-28 pt-20 text-center">
				<h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Ready to stand out?</h2>
				<p className="mx-auto mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>Claim your free page and start sharing in minutes.</p>
				<ClaimInput className="mx-auto mt-8" />
			</section>

			{/* Footer */}
			<footer className="container-max flex flex-col items-center justify-between gap-4 border-t py-10 md:flex-row" style={{ borderColor: "var(--border)" }}>
				<div className="text-sm" style={{ color: "var(--text-secondary)" }}>SuperLinks.me &copy; {new Date().getFullYear()}</div>
				<div className="flex gap-6">
					<a href="/discover" className="text-sm hover:underline" style={{ color: "var(--text-secondary)" }}>Explore</a>
					<a href="/docs" className="text-sm hover:underline" style={{ color: "var(--text-secondary)" }}>Developers</a>
				</div>
			</footer>
		</div>
	);
}

const ClaimInput = ({ className = "" }: { className?: string }) => {
	const [username, setUsername] = useState("");

	const handleClaim = () => {
		const sanitized = username.trim().replace(/[^a-zA-Z0-9_-]/g, "");
		if (sanitized) {
			window.location.href = `/signup?username=${encodeURIComponent(sanitized)}`;
		}
	};

	return (
		<div className={`flex max-w-lg items-center overflow-hidden rounded-[14px] border shadow-sm ${className}`} style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
			<span className="whitespace-nowrap py-3.5 pl-4 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>superlinks.me/</span>
			<Input
				className="border-0 bg-transparent shadow-none focus-visible:ring-0"
				placeholder="username"
				autoComplete="off"
				spellCheck={false}
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				onKeyDown={(e) => { if (e.key === "Enter") handleClaim(); }}
			/>
			<button
				type="button"
				className="shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors hover:text-[var(--accent-hover)]"
				onClick={handleClaim}
			>
				Claim for free
			</button>
		</div>
	);
};

const PhoneMockup = () => (
	<div className="w-72 rounded-[2.75rem] border p-6 pb-9 shadow-2xl" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
		<div className="mx-auto mb-7 h-1.5 w-20 rounded-full" style={{ background: "var(--border)" }} />
		<div className="mb-6 text-center">
			<div className="mx-auto mb-3 h-16 w-16 rounded-full" style={{ background: "linear-gradient(135deg, #333, #888)" }} />
			<div className="text-sm font-bold">Sarah Chen</div>
			<div className="text-xs" style={{ color: "var(--text-secondary)" }}>@sarahcreates</div>
		</div>
		<div className="space-y-2.5">
			{["My Latest Collection", "YouTube Channel", "Book a Consultation"].map((label) => (
				<div key={label} className="rounded-full border py-3 text-center text-sm font-medium" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
					{label}
				</div>
			))}
			<div className="flex items-center gap-2.5 rounded-3xl border p-2.5" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
				<div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: "linear-gradient(135deg, #444, #888)" }} />
				<div>
					<div className="text-xs leading-tight">Design Templates Pack</div>
					<div className="text-xs font-semibold">9.99 USDC</div>
				</div>
			</div>
		</div>
	</div>
);

const Section = ({
	id,
	label,
	title,
	description,
	children,
	reverse,
	bg,
}: {
	id: string;
	label: string;
	title: string;
	description: string;
	children: React.ReactNode;
	reverse?: boolean;
	bg?: boolean;
}) => (
	<section id={id} className="py-24" style={bg ? { background: "var(--bg-elevated)" } : undefined}>
		<div className={`container-max grid items-center gap-20 lg:grid-cols-2 ${reverse ? "[&>:first-child]:order-2 [&>:last-child]:order-1 lg:[&>:first-child]:order-2" : ""}`}>
			<div>
				<div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>{label}</div>
				<h2 className="text-3xl font-semibold leading-tight tracking-tight">{title}</h2>
				<p className="mt-5 max-w-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>{description}</p>
			</div>
			<div className="rounded-[2rem] border p-10 shadow-sm" style={{ background: bg ? "var(--bg)" : "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
				{children}
			</div>
		</div>
	</section>
);
