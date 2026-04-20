import type { resolveThemeVars } from "~/features/creator-page/lib/theming";

type ResolvedTheme = ReturnType<typeof resolveThemeVars>;

export interface PreviewLink {
	id: string;
	title: string;
	url?: string;
	icon?: string | null;
}

export interface PreviewProduct {
	id: string;
	title: string;
	price: string;
	content_type: string;
	status?: string;
}

interface ProfilePreviewProps {
	displayName: string;
	handle: string;
	bio?: string;
	avatarUrl?: string | null;
	website?: string;
	twitter?: string;
	telegram?: string;
	farcaster?: string;
	links: PreviewLink[];
	products: PreviewProduct[];
	theme: ResolvedTheme;
}

const CONTENT_TYPE_EMOJI: Record<string, string> = {
	image: "🖼",
	video: "🎬",
	pdf: "📄",
	app: "📱",
	fundraiser: "🤝",
};

const buildLinkItemStyle = (theme: ResolvedTheme, fallbackText: string): React.CSSProperties => {
	const linkBorderRadius = theme.linkStyle.match(/border-radius:([^;]+)/)?.[1] ?? "12px";

	if (theme.btnFill === "outline") {
		return {
			borderRadius: linkBorderRadius,
			border: `1px solid ${theme.effectiveBtnColor}40`,
			background: "transparent",
			color: theme.btnTextColor || fallbackText,
		};
	}

	if (theme.btnFill === "glass") {
		return {
			borderRadius: linkBorderRadius,
			border: `1px solid ${theme.effectiveBtnColor}30`,
			background: `${theme.effectiveBtnColor}18`,
			backdropFilter: "blur(8px)",
			color: theme.btnTextColor || fallbackText,
		};
	}

	return {
		borderRadius: linkBorderRadius,
		border: `1px solid ${theme.effectiveBtnColor}`,
		background: theme.effectiveBtnColor,
		color: theme.btnTextColor || "#ffffff",
	};
};

export const ProfilePreview = ({
	displayName,
	handle,
	bio,
	avatarUrl,
	website,
	twitter,
	telegram,
	farcaster,
	links,
	products,
	theme,
}: ProfilePreviewProps) => {
	const previewBg = theme.cssVars["--lt-bg"] ?? "#ffffff";
	const previewText = theme.cssVars["--lt-text"] ?? "#111";
	const previewDim = theme.cssVars["--lt-dim"] ?? "#666";
	const previewBorder = theme.cssVars["--lt-border"] ?? "#e5e5e5";

	const isLeftLayout = theme.headerLayout === "left";
	const isOutline = theme.btnFill === "outline";
	const linkItemStyle = buildLinkItemStyle(theme, previewText);

	const hasSocials = Boolean(website || twitter || telegram || farcaster);
	const shopProducts = products.filter(
		(p) => p.content_type !== "app" && p.content_type !== "fundraiser" && (p.status ?? "active") === "active",
	);

	const resolvedDisplayName = displayName || "My Store";
	const resolvedHandle = handle || "handle";
	const avatarInitial = resolvedDisplayName.charAt(0).toUpperCase() || "S";
	const avatarSize = isLeftLayout ? "56px" : theme.avatarPx;

	return (
		<div
			className="overflow-hidden rounded-[2rem] border p-6 shadow-lg"
			style={{
				background: previewBg,
				borderColor: previewBorder,
				width: "280px",
				minHeight: "500px",
				fontFamily: theme.cssVars["--lt-font"] ?? "Inter, sans-serif",
				color: previewText,
			}}
		>
			<div className="mx-auto mb-6 h-1.5 w-16 rounded-full" style={{ background: previewBorder }} />

			<div className={isLeftLayout ? "mb-4 flex flex-wrap items-center gap-3" : "mb-6 text-center"}>
				<div
					className={`flex items-center justify-center overflow-hidden rounded-full font-extrabold text-white ${
						isLeftLayout ? "shrink-0 text-lg" : "mx-auto mb-3 text-xl"
					}`}
					style={{
						width: avatarSize,
						height: avatarSize,
						background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : theme.effectiveBtnColor,
						boxShadow:
							theme.avatarShadowColor !== theme.accentColor
								? `0 4px 20px ${theme.avatarShadowColor}40`
								: undefined,
					}}
				>
					{!avatarUrl && avatarInitial}
				</div>
				<div className={isLeftLayout ? "min-w-0 flex-1" : ""}>
					<div className="text-sm font-bold" style={{ color: previewText }}>
						{resolvedDisplayName}
					</div>
				</div>
				<div className={isLeftLayout ? "w-full" : ""} style={{ marginTop: isLeftLayout ? "-4px" : undefined }}>
					<div className="text-xs" style={{ color: previewDim }}>
						@{resolvedHandle}
					</div>
				</div>
				{bio && (
					<div
						className={`text-xs leading-relaxed ${isLeftLayout ? "w-full" : "mx-auto mt-2 max-w-[200px]"}`}
						style={{ color: previewDim }}
					>
						{bio}
					</div>
				)}

				{hasSocials && (
					<div
						className={`mt-3 flex flex-wrap gap-1.5 ${
							isLeftLayout ? "w-full justify-start" : "justify-center"
						}`}
					>
						{website && (
							<span
								className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold"
								style={{
									borderColor: `${theme.socialLinksColor}60`,
									color: theme.socialLinksColor,
								}}
							>
								Web
							</span>
						)}
						{twitter && (
							<span
								className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold"
								style={{
									borderColor: `${theme.socialLinksColor}60`,
									color: theme.socialLinksColor,
								}}
							>
								X
							</span>
						)}
						{telegram && (
							<span
								className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold"
								style={{
									borderColor: `${theme.socialLinksColor}60`,
									color: theme.socialLinksColor,
								}}
							>
								Telegram
							</span>
						)}
						{farcaster && (
							<span
								className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold"
								style={{
									borderColor: `${theme.socialLinksColor}60`,
									color: theme.socialLinksColor,
								}}
							>
								Farcaster
							</span>
						)}
					</div>
				)}
			</div>

			{links.length > 0 && (
				<div className="mb-5 flex flex-col gap-2">
					{links.slice(0, 5).map((link) => {
						const icon = link.icon || "🔗";
						const isGif = typeof icon === "string" && icon.startsWith("http");
						return (
							<div
								key={link.id}
								className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
								style={linkItemStyle}
							>
								<span className="inline-flex w-5 shrink-0 items-center justify-center text-sm">
									{isGif ? <img src={icon} alt="" className="h-5 w-5 rounded object-cover" /> : icon}
								</span>
								<span className="truncate">{link.title}</span>
								{isOutline && (
									<span className="ml-auto shrink-0 text-base opacity-40" aria-hidden="true">
										›
									</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			{shopProducts.length > 0 && (
				<div>
					<div
						className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
						style={{ color: previewDim }}
					>
						Shop
					</div>
					<div className="flex flex-col gap-2">
						{shopProducts.slice(0, 5).map((p) => (
							<div
								key={p.id}
								className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
								style={linkItemStyle}
							>
								<span className="inline-flex w-5 shrink-0 items-center justify-center text-sm">
									{CONTENT_TYPE_EMOJI[p.content_type] ?? "📦"}
								</span>
								<span className="truncate">{p.title}</span>
								<span className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] opacity-70">
									{parseFloat(p.price) === 0 ? "Free" : `${p.price} USDC`}
									{isOutline && (
										<span className="text-base" aria-hidden="true">
											›
										</span>
									)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{links.length === 0 && shopProducts.length === 0 && (
				<div className="py-8 text-center text-xs" style={{ color: previewDim }}>
					Your links and products will appear here
				</div>
			)}
		</div>
	);
};
