import type { Route } from "./+types/creator-page";
import { getEnv } from "~/lib/env.server";
import { fetchStore } from "~/lib/commerce.server";
import { getOptionalSession } from "~/features/auth/server/auth.server";
import { resolveThemeVars } from "~/features/creator-page/lib/theming";
import { generateWallpaperSvg } from "~/features/creator-page/lib/wallpaper";
import { timeAgo } from "~/lib/utils";
import { lazy, Suspense } from "react";

const CheckoutModal = lazy(() => import("~/features/creator-page/components/checkout-modal.client"));
const QRModal = lazy(() => import("~/features/creator-page/components/qr-modal.client"));
const ShareModal = lazy(() => import("~/features/creator-page/components/share-modal.client"));

export const meta: Route.MetaFunction = ({ data }: { data?: Record<string, any> }) => {
	if (!data?.storefront) return [{ title: "SuperLinks.me" }];
	const s = data.storefront;
	const displayName = s.profiles?.display_name ?? s.name ?? s.slug;
	return [
		{ title: `${displayName} — SuperLinks.me` },
		{ name: "description", content: s.bio ?? `${displayName} on SuperLinks.me` },
		{ property: "og:title", content: `${displayName} — SuperLinks.me` },
		{ property: "og:description", content: s.bio ?? `${displayName} on SuperLinks.me` },
		{ property: "og:type", content: "profile" },
		...(s.avatar_url ? [{ property: "og:image", content: s.avatar_url }] : []),
	];
};

const RESERVED_PATHS = new Set([".well-known", "favicon.ico", "robots.txt", "sitemap.xml"]);

export const loader = async ({ params, request, context }: Route.LoaderArgs) => {
	if (RESERVED_PATHS.has(params.handle.split("/")[0] ?? "")) {
		throw new Response("Not found", { status: 404 });
	}

	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);

	try {
		const [data, { user }] = await Promise.all([
			fetchStore(SUPABASE_URL, SUPABASE_ANON_KEY, params.handle),
			getOptionalSession(request, context),
		]);
		const storefront = (data as Record<string, any>).storefront;
		const isOwner = !!(user && storefront?.owner_id === user.id);

		return {
			storefront: storefront ?? {},
			products: ((data as Record<string, any>).products ?? []) as any[],
			posts: ((data as Record<string, any>).posts ?? []) as any[],
			links: ((data as Record<string, any>).links ?? []) as any[],
			isOwner,
			ENV: getEnv(context),
		};
	} catch {
		throw new Response("Profile not found", { status: 404 });
	}
};

export default function CreatorPage({ loaderData }: Route.ComponentProps) {
	const s = loaderData.storefront as Record<string, any>;
	const products = loaderData.products;
	const posts = loaderData.posts;
	const links = loaderData.links;
	const isOwner = loaderData.isOwner;
	const displayName = s.profiles?.display_name ?? s.name ?? s.slug;
	const username = s.profiles?.username ?? s.slug;
	const theme = resolveThemeVars(s.theme);
	const wallpaperSvg = generateWallpaperSvg(theme.wallpaperStyle, theme.accentColor);

	const cssVarStyle = Object.entries(theme.cssVars).reduce(
		(acc, [k, v]) => ({ ...acc, [k]: v }),
		{} as Record<string, string>,
	);

	const bgInline =
		theme.bgStyle === "gradient"
			? { background: `linear-gradient(135deg, ${theme.accentColor}22 0%, ${theme.bgColor || "var(--lt-bg)"} 60%)` }
			: {};

	const avatarStyle = {
		width: theme.avatarPx,
		height: theme.avatarPx,
		boxShadow: `0 4px 20px ${theme.avatarShadowColor}40`,
	};

	const customLinks = (links ?? []) as Array<{ id: string; title: string; url: string; icon: string | null; sort_order: number }>;
	const shopProducts = products.filter((p: any) => p.content_type !== "app" && p.content_type !== "fundraiser");

	return (
		<div style={{ ...cssVarStyle, ...bgInline } as React.CSSProperties}>
			{wallpaperSvg && (
				<div
					className="pointer-events-none fixed inset-0 z-0"
					dangerouslySetInnerHTML={{ __html: wallpaperSvg }}
				/>
			)}

			<div className="relative z-[1] mx-auto max-w-[480px] px-5 pb-[60px] pt-12">
				<div
					className="mb-6 rounded-[20px] border p-8 shadow-md"
					style={{ background: "var(--lt-card, #ffffff)", borderColor: "var(--lt-border, #E5E5E5)" }}
				>
					{/* Header */}
					<div className="mb-6 text-center">
						<div
							className="mx-auto mb-4 flex items-center justify-center overflow-hidden rounded-full text-2xl font-extrabold text-white"
							style={{ ...avatarStyle, background: theme.effectiveBtnColor }}
						>
							{s.avatar_url ? (
								<img src={s.avatar_url} alt={displayName} className="h-full w-full object-cover" />
							) : (
								displayName.charAt(0).toUpperCase()
							)}
						</div>
						<h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--lt-text, #111)" }}>
							{displayName}
						</h1>
						<p className="mt-0.5 text-sm" style={{ color: "var(--lt-dim, #666)" }}>@{username}</p>
						{s.bio && <p className="mx-auto mt-3 max-w-[360px] text-sm leading-relaxed" style={{ color: "var(--lt-dim, #666)" }}>{s.bio}</p>}

						{/* Social badges */}
						{(s.website || s.twitter || s.telegram || s.farcaster) && (
							<div className="mt-3.5 flex flex-wrap justify-center gap-2">
								{s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--lt-accent)] hover:text-white" style={{ borderColor: "var(--lt-accent)", color: "var(--lt-accent)" }}>Web</a>}
								{s.twitter && <a href={`https://x.com/${s.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--lt-accent)] hover:text-white" style={{ borderColor: "var(--lt-accent)", color: "var(--lt-accent)" }}>X</a>}
								{s.telegram && <a href={`https://t.me/${s.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--lt-accent)] hover:text-white" style={{ borderColor: "var(--lt-accent)", color: "var(--lt-accent)" }}>Telegram</a>}
								{s.farcaster && <a href={`https://warpcast.com/${s.farcaster.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--lt-accent)] hover:text-white" style={{ borderColor: "var(--lt-accent)", color: "var(--lt-accent)" }}>Farcaster</a>}
							</div>
						)}

						{isOwner && (
							<a href="/dashboard/links" className="mt-4 inline-block rounded-full border px-6 py-2 text-sm font-semibold transition-colors hover:bg-[var(--lt-btn-accent)] hover:text-white" style={{ borderColor: "var(--lt-border, #E5E5E5)" }}>
								Edit profile
							</a>
						)}
					</div>

					{/* Custom links */}
					{customLinks.length > 0 && (
						<div className="mb-9 flex flex-col gap-2.5">
							{customLinks.map((link) => {
								const icon = link.icon || "🔗";
								const isGif = icon.startsWith("http");
								return (
									<a
										key={link.id}
										href={link.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
										style={{ ...parseStyle(theme.linkStyle) }}
									>
										<span className="inline-flex w-8 shrink-0 items-center justify-center text-base">
											{isGif ? <img src={icon} alt="" className="h-8 w-8 rounded-md object-cover" /> : icon}
										</span>
										{link.title}
									</a>
								);
							})}
						</div>
					)}

					{/* Shop products */}
					{shopProducts.length > 0 && (
						<div className="mb-9">
							<h2 className="mb-3.5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--lt-dim, #666)" }}>Shop</h2>
							<div className="flex flex-col gap-2.5">
								{shopProducts.map((p: any) => (
									<button
										key={p.id}
										className="flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5"
										style={{ ...parseStyle(theme.linkStyle) }}
									>
										<span className="inline-flex w-8 shrink-0 items-center justify-center text-base">
											{p.content_type === "image" ? "🖼" : p.content_type === "video" ? "🎬" : p.content_type === "pdf" ? "📄" : "📦"}
										</span>
										{p.title}
										<span className="ml-auto whitespace-nowrap text-xs opacity-60">
											{parseFloat(p.price) === 0 ? "Free" : `${p.price} USDC`}
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Posts */}
					{posts.length > 0 && (
						<div className="mb-9">
							<h2 className="mb-3.5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--lt-dim, #666)" }}>Updates</h2>
							<div className="flex flex-col gap-3">
								{posts.slice(0, 5).map((p: any) => (
									<div key={p.id} className="rounded-xl border p-4 shadow-sm" style={{ background: "var(--lt-card, #fff)", borderColor: "var(--lt-border, #E5E5E5)" }}>
										<div className="mb-1.5 text-[0.7rem]" style={{ color: "var(--lt-dim, #666)" }}>{timeAgo(p.created_at)}</div>
										{p.content && <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{p.content}</div>}
										{p.media_url && p.media_type === "image" && <img src={p.media_url} alt="" className="mt-2.5 max-h-[300px] w-full rounded-lg object-cover" />}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Footer CTA */}
				<div className="mt-12 text-center">
					<a
						href="/signup"
						className="inline-block rounded-full px-7 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
						style={{ background: theme.effectiveBtnColor }}
					>
						Create a profile on SuperLinks.me
					</a>
				</div>
			</div>

			{/* Client-only interactive modals */}
			<Suspense fallback={null}>
				<QRModal />
			</Suspense>
			<Suspense fallback={null}>
				<ShareModal displayName={displayName} username={username} avatarUrl={s.avatar_url} accentColor={theme.effectiveBtnColor} />
			</Suspense>
			<Suspense fallback={null}>
				<CheckoutModal displayName={displayName} username={username} />
			</Suspense>
		</div>
	);
}

function parseStyle(styleStr: string): React.CSSProperties {
	const style: Record<string, string> = {};
	for (const part of styleStr.split(";")) {
		const [key, ...rest] = part.split(":");
		if (key && rest.length) {
			const camelKey = key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
			style[camelKey] = rest.join(":").trim();
		}
	}
	return style as React.CSSProperties;
}
