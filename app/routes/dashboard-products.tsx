import type { Route } from "./+types/dashboard-products";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { commerceFetch } from "~/lib/commerce";
import { resolveThemeVars } from "~/features/creator-page/lib/theming";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";

interface Product {
	id: string;
	title: string;
	price: string;
	description?: string;
	content_type: string;
	status: string;
	created_at: string;
}

interface Post {
	id: string;
	content: string;
	created_at: string;
	author_id: string;
	media_url?: string | null;
	media_type?: string | null;
	profiles?: { username: string; display_name: string | null };
}

export const meta: Route.MetaFunction = () => [
	{ title: "Products — SuperLinks.me" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const { session, headers } = await requireAuth(request, context);
	return withHeaders({ token: session?.access_token ?? "", ENV: getEnv(context) }, headers);
};

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { session, headers } = await requireAuth(request, context);
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv(context);
	const token = session?.access_token ?? "";
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (!intent || typeof intent !== "string") {
		return withHeaders({ ok: false, error: "Missing intent" }, headers);
	}

	const body: Record<string, unknown> = {};
	for (const [key, value] of formData.entries()) {
		if (key !== "intent") body[key] = value;
	}

	const result = await callCommerce({
		supabaseUrl: SUPABASE_URL,
		anonKey: SUPABASE_ANON_KEY,
		accessToken: token,
		action: intent,
		body,
	});

	return withHeaders({ ok: true, result }, headers);
};

const CONTENT_TYPE_EMOJI: Record<string, string> = {
	image: "🖼",
	video: "🎬",
	pdf: "📄",
	app: "📱",
	fundraiser: "🤝",
};

const CONTENT_TYPES = [
	{ value: "pdf", label: "PDF" },
	{ value: "video", label: "Video" },
	{ value: "image", label: "Image" },
	{ value: "bundle", label: "Bundle" },
	{ value: "app", label: "App" },
	{ value: "fundraiser", label: "Fundraiser" },
];

function timeAgo(dateStr: string): string {
	const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function ProductSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="h-12 animate-pulse rounded-xl border"
					style={{ borderColor: "var(--border)", background: "var(--muted)" }}
				/>
			))}
		</div>
	);
}

// ─── Products List Tab ──────────────────────────────────────────────────────

const ProductsTab = ({
	products,
	loading,
	loadError,
	onReload,
	env,
	token,
}: {
	products: Product[] | null;
	loading: boolean;
	loadError: boolean;
	onReload: () => void;
	env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
	token: string;
}) => {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editPrice, setEditPrice] = useState("");
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const handleDelete = useCallback(async (productId: string) => {
		if (!confirm("Permanently delete this product? This cannot be undone.")) return;
		setActionLoading(productId);
		try {
			await commerceFetch(env, token, "delete-product", { productId });
			toast.success("Product deleted");
			onReload();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setActionLoading(null);
		}
	}, [env, token, onReload]);

	const handleToggleStatus = useCallback(async (productId: string, newStatus: string) => {
		setActionLoading(productId);
		try {
			await commerceFetch(env, token, "edit-product", { productId, status: newStatus });
			toast.success(newStatus === "active" ? "Product relisted" : "Product unlisted");
			onReload();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setActionLoading(null);
		}
	}, [env, token, onReload]);

	const handleSaveEdit = useCallback(async () => {
		if (!editingId) return;
		setActionLoading(editingId);
		try {
			await commerceFetch(env, token, "edit-product", {
				productId: editingId,
				title: editTitle,
				price: editPrice,
			});
			toast.success("Product updated");
			setEditingId(null);
			onReload();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setActionLoading(null);
		}
	}, [editingId, editTitle, editPrice, env, token, onReload]);

	if (loadError) {
		return (
			<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
				Failed to load products.{" "}
				<button className="cursor-pointer underline" onClick={onReload}>Refresh</button>
			</p>
		);
	}

	if (loading || products === null) return <ProductSkeleton />;

	if (products.length === 0) {
		return (
			<div
				className="rounded-xl border border-dashed p-10 text-center text-sm"
				style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
			>
				No products yet. Add your first product.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{products.map((p) => (
				<div key={p.id}>
					<div
						className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
						style={{ borderColor: "var(--border)", background: "var(--card)" }}
					>
						<span className="text-base" aria-hidden="true">
							{CONTENT_TYPE_EMOJI[p.content_type] ?? "📦"}
						</span>
						<div className="min-w-0 flex-1">
							<div className="truncate font-medium">{p.title}</div>
							<div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
								{parseFloat(p.price) === 0 ? "Free" : `${p.price} USDC`} · {p.status} · {timeAgo(p.created_at)}
							</div>
						</div>
						<div className="flex shrink-0 gap-1.5">
							<Button
								variant="outline"
								size="xs"
								onClick={() => {
									setEditingId(p.id);
									setEditTitle(p.title);
									setEditPrice(p.price);
								}}
							>
								Edit
							</Button>
							<Button
								variant="outline"
								size="xs"
								disabled={actionLoading === p.id}
								onClick={() => handleToggleStatus(p.id, p.status === "active" ? "unlisted" : "active")}
							>
								{p.status === "active" ? "Unlist" : "Relist"}
							</Button>
							<Button
								variant="ghost"
								size="xs"
								className="text-[var(--danger)]"
								disabled={actionLoading === p.id}
								onClick={() => handleDelete(p.id)}
							>
								Delete
							</Button>
						</div>
					</div>

					{editingId === p.id && (
						<div
							className="mt-1 rounded-xl border p-4"
							style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
						>
							<div className="flex flex-col gap-3">
								<div>
									<Label htmlFor={`edit-title-${p.id}`}>Title</Label>
									<Input
										id={`edit-title-${p.id}`}
										className="mt-1"
										value={editTitle}
										onChange={(e) => setEditTitle(e.target.value)}
									/>
								</div>
								<div>
									<Label htmlFor={`edit-price-${p.id}`}>Price (USDC)</Label>
									<Input
										id={`edit-price-${p.id}`}
										className="mt-1"
										type="number"
										step="0.01"
										min="0"
										value={editPrice}
										onChange={(e) => setEditPrice(e.target.value)}
									/>
								</div>
								<div className="flex gap-2">
									<Button size="sm" onClick={handleSaveEdit} disabled={actionLoading === p.id}>
										{actionLoading === p.id ? "Saving..." : "Save"}
									</Button>
									<Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
										Cancel
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			))}
		</div>
	);
};

// ─── Add Product Tab ────────────────────────────────────────────────────────

const AddProductTab = ({
	storeId,
	env,
	token,
	onProductAdded,
}: {
	storeId: string;
	env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
	token: string;
	onProductAdded: () => void;
}) => {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState("");
	const [contentType, setContentType] = useState("pdf");
	const [goalAmount, setGoalAmount] = useState("");
	const [entryPoint, setEntryPoint] = useState("index.html");
	const [submitting, setSubmitting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isFundraiser = contentType === "fundraiser";
	const isApp = contentType === "app";

	const handleSubmit = useCallback(async () => {
		if (!title.trim() || !price.trim()) {
			toast.error("Title and price are required");
			return;
		}

		if (isFundraiser) {
			if (!goalAmount || parseFloat(goalAmount) <= 0) {
				toast.error("Please enter a funding goal");
				return;
			}
		} else {
			const file = fileInputRef.current?.files?.[0];
			if (!file) {
				toast.error("Please select a file");
				return;
			}
			const maxSize = isApp ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
			if (file.size > maxSize) {
				toast.error(`File too large (max ${isApp ? "50MB" : "5MB"})`);
				return;
			}
		}

		setSubmitting(true);

		try {
			if (isFundraiser) {
				await commerceFetch(env, token, "add-product", {
					storefrontId: storeId,
					title: title.trim(),
					price: price.trim(),
					contentType,
					description: description.trim() || undefined,
					metadata: { goal_amount: parseFloat(goalAmount), preset_amounts: [5, 10, 25, 50] },
				});
				toast.success(`Created fundraiser "${title.trim()}"`);
			} else {
				const file = fileInputRef.current!.files![0];
				const fileContent = await readFileAsBase64(file);

				if (isApp) {
					await commerceFetch(env, token, "add-app", {
						storefrontId: storeId,
						title: title.trim(),
						price: price.trim(),
						fileContent,
						entryPoint,
						description: description.trim() || undefined,
					});
					toast.success(`App "${title.trim()}" deployed!`);
				} else {
					await commerceFetch(env, token, "add-product", {
						storefrontId: storeId,
						title: title.trim(),
						price: price.trim(),
						contentType,
						fileContent,
						fileName: file.name,
						mimeType: file.type || "application/octet-stream",
						description: description.trim() || undefined,
					});
					toast.success(`Listed "${title.trim()}" for ${price.trim()} USDC`);
				}
			}

			setTitle("");
			setDescription("");
			setPrice("");
			setGoalAmount("");
			setEntryPoint("index.html");
			if (fileInputRef.current) fileInputRef.current.value = "";
			onProductAdded();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	}, [title, description, price, contentType, goalAmount, entryPoint, isFundraiser, isApp, storeId, env, token, onProductAdded]);

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="ap-title">Title</Label>
				<Input id="ap-title" className="mt-1" placeholder="Product title" value={title} onChange={(e) => setTitle(e.target.value)} />
			</div>
			<div>
				<Label htmlFor="ap-description">Description</Label>
				<Textarea id="ap-description" className="mt-1" rows={3} placeholder="Describe your product..." value={description} onChange={(e) => setDescription(e.target.value)} />
			</div>
			<div>
				<Label htmlFor="ap-price">{isFundraiser ? "Suggested Amount (USDC)" : "Price (USDC)"}</Label>
				<Input id="ap-price" className="mt-1" type="number" step="0.01" min="0" placeholder="5.00" value={price} onChange={(e) => setPrice(e.target.value)} />
			</div>
			<div>
				<Label htmlFor="ap-type">Content Type</Label>
				<select
					id="ap-type"
					className="mt-1 flex h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
					style={{ borderColor: "var(--border)" }}
					value={contentType}
					onChange={(e) => setContentType(e.target.value)}
				>
					{CONTENT_TYPES.map((ct) => (
						<option key={ct.value} value={ct.value}>{ct.label}</option>
					))}
				</select>
			</div>

			{isFundraiser && (
				<div>
					<Label htmlFor="ap-goal">Funding Goal (USDC)</Label>
					<Input id="ap-goal" className="mt-1" type="number" step="0.01" min="1" placeholder="1000.00" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
				</div>
			)}

			{isApp && (
				<div>
					<Label htmlFor="ap-entry">Entry Point</Label>
					<Input id="ap-entry" className="mt-1" placeholder="index.html" value={entryPoint} onChange={(e) => setEntryPoint(e.target.value)} />
				</div>
			)}

			{!isFundraiser && (
				<div>
					<Label htmlFor="ap-file">File</Label>
					<Input
						id="ap-file"
						className="mt-1"
						type="file"
						ref={fileInputRef}
						accept={isApp ? ".zip" : undefined}
					/>
				</div>
			)}

			<Button onClick={handleSubmit} disabled={submitting}>
				{submitting ? "Uploading..." : "Upload & List"}
			</Button>
		</div>
	);
};

// ─── Posts Tab ──────────────────────────────────────────────────────────────

const PostsTab = ({
	storeId,
	env,
	token,
}: {
	storeId: string;
	env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
	token: string;
}) => {
	const [posts, setPosts] = useState<Post[] | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [postContent, setPostContent] = useState("");
	const [posting, setPosting] = useState(false);

	const loadPosts = useCallback(async () => {
		setLoadError(false);
		try {
			const data = await commerceFetch<{ posts?: Post[] }>(env, token, "get-posts", { storefrontId: storeId });
			setPosts(data.posts ?? []);
		} catch {
			setLoadError(true);
		}
	}, [env, token, storeId]);

	useEffect(() => {
		loadPosts();
	}, [loadPosts]);

	const handlePost = useCallback(async () => {
		if (!postContent.trim()) return;
		setPosting(true);
		try {
			await commerceFetch(env, token, "create-post", { content: postContent.trim() });
			toast.success("Posted");
			setPostContent("");
			loadPosts();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setPosting(false);
		}
	}, [postContent, env, token, loadPosts]);

	const handleDeletePost = useCallback(async (postId: string) => {
		try {
			await commerceFetch(env, token, "delete-post", { postId });
			toast.success("Post deleted");
			loadPosts();
		} catch (err) {
			toast.error((err as Error).message);
		}
	}, [env, token, loadPosts]);

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<Textarea
					rows={3}
					placeholder="What's on your mind?"
					value={postContent}
					onChange={(e) => setPostContent(e.target.value)}
				/>
				<Button onClick={handlePost} disabled={posting || !postContent.trim()}>
					{posting ? "Posting..." : "Post"}
				</Button>
			</div>

			<Separator />

			{loadError ? (
				<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
					Failed to load posts.{" "}
					<button className="cursor-pointer underline" onClick={loadPosts}>Refresh</button>
				</p>
			) : posts === null ? (
				<ProductSkeleton />
			) : posts.length === 0 ? (
				<p className="text-sm" style={{ color: "var(--text-secondary)" }}>No posts yet.</p>
			) : (
				<div className="flex flex-col gap-3">
					{posts.map((post) => (
						<div
							key={post.id}
							className="rounded-xl border p-4"
							style={{ borderColor: "var(--border)", background: "var(--card)" }}
						>
							<div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
								<span className="font-medium" style={{ color: "var(--text-secondary)" }}>
									@{post.profiles?.username ?? "you"}
								</span>
								<span>{timeAgo(post.created_at)}</span>
								<button
									className="ml-auto cursor-pointer text-[var(--danger)] hover:underline"
									onClick={() => handleDeletePost(post.id)}
									aria-label="Delete post"
								>
									Delete
								</button>
							</div>
							<div className="whitespace-pre-wrap break-words text-sm">{post.content}</div>
							{post.media_url && post.media_type === "image" && (
								<img src={post.media_url} alt="" className="mt-2 max-h-[200px] rounded-lg object-cover" />
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// ─── Page Preview ───────────────────────────────────────────────────────────

interface ProfileData {
	username?: string;
	display_name?: string;
	avatar_url?: string;
	theme?: Record<string, unknown>;
}

const PagePreview = ({
	products,
	profile,
	storeName,
}: {
	products: Product[];
	profile: ProfileData | null;
	storeName: string;
}) => {
	const theme = resolveThemeVars(profile?.theme);
	const displayName = profile?.display_name ?? storeName;
	const handle = profile?.username ?? storeName;
	const previewBg = theme.cssVars["--lt-bg"] ?? "#ffffff";
	const previewText = theme.cssVars["--lt-text"] ?? "#111";
	const previewDim = theme.cssVars["--lt-dim"] ?? "#666";
	const previewBorder = theme.cssVars["--lt-border"] ?? "#e5e5e5";
	const isLeftLayout = theme.headerLayout === "left";

	const linkBorderRadius =
		theme.linkStyle.match(/border-radius:([^;]+)/)?.[1] ?? "12px";

	const linkItemStyle = ((): React.CSSProperties => {
		if (theme.btnFill === "outline") {
			return {
				borderRadius: linkBorderRadius,
				border: `1px solid ${theme.effectiveBtnColor}40`,
				background: "transparent",
				color: theme.btnTextColor || previewText,
			};
		}
		if (theme.btnFill === "glass") {
			return {
				borderRadius: linkBorderRadius,
				border: `1px solid ${theme.effectiveBtnColor}30`,
				background: `${theme.effectiveBtnColor}18`,
				backdropFilter: "blur(8px)",
				color: theme.btnTextColor || previewText,
			};
		}
		return {
			borderRadius: linkBorderRadius,
			border: `1px solid ${theme.effectiveBtnColor}`,
			background: theme.effectiveBtnColor,
			color: theme.btnTextColor || "#ffffff",
		};
	})();

	const shopProducts = products.filter(
		(p) => p.status === "active" && p.content_type !== "app" && p.content_type !== "fundraiser",
	);

	return (
		<div className="sticky top-8">
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
					{(() => {
						const avatarSrc = profile?.avatar_url;
						const avatarSize = isLeftLayout ? "56px" : theme.avatarPx;
						return (
							<div
								className={`flex items-center justify-center overflow-hidden rounded-full font-extrabold text-white ${
									isLeftLayout ? "h-14 w-14 shrink-0 text-lg" : "mx-auto mb-3 h-16 w-16 text-xl"
								}`}
								style={{
									background: avatarSrc ? `url(${avatarSrc}) center/cover no-repeat` : theme.effectiveBtnColor,
									width: avatarSize,
									height: avatarSize,
								}}
							>
								{!avatarSrc && (displayName.charAt(0).toUpperCase() || "S")}
							</div>
						);
					})()}
					<div className={isLeftLayout ? "min-w-0 flex-1" : ""}>
						<div className="text-sm font-bold" style={{ color: previewText }}>
							{displayName}
						</div>
					</div>
					<div className={isLeftLayout ? "w-full" : ""} style={{ marginTop: isLeftLayout ? "-4px" : undefined }}>
						<div className="text-xs" style={{ color: previewDim }}>@{handle}</div>
					</div>
				</div>

				{shopProducts.length > 0 && (
					<div>
						<div className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: previewDim }}>
							Shop
						</div>
						<div className="space-y-2">
							{shopProducts.slice(0, 5).map((p) => (
								<div
									key={p.id}
									className="flex items-center px-4 py-2.5 text-xs font-medium"
									style={linkItemStyle}
								>
									<span className="mr-2">
										{CONTENT_TYPE_EMOJI[p.content_type] ?? "📦"}
									</span>
									<span className="truncate">{p.title}</span>
									<span className="ml-auto shrink-0 pl-2 text-[10px] opacity-60">
										{parseFloat(p.price) === 0 ? "Free" : `${p.price} USDC`}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{shopProducts.length === 0 && (
					<div className="py-8 text-center text-xs" style={{ color: previewDim }}>
						Products will appear here
					</div>
				)}
			</div>
		</div>
	);
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardProductsRoute({ loaderData }: Route.ComponentProps) {
	const { token, ENV } = loaderData;
	const [products, setProducts] = useState<Product[] | null>(null);
	const [storeId, setStoreId] = useState<string | null>(null);
	const [storeName, setStoreName] = useState("");
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [activeTab, setActiveTab] = useState("products");

	const loadProducts = useCallback(async () => {
		setLoadError(false);
		try {
			const [storeData, productData, profileData] = await Promise.all([
				commerceFetch<{ storefronts?: Array<{ id: string; name: string }> }>(ENV, token, "my-storefronts"),
				commerceFetch<{ products?: Product[] }>(ENV, token, "my-products"),
				commerceFetch<ProfileData>(ENV, token, "get-profile"),
			]);
			const storefronts = storeData.storefronts ?? [];
			if (storefronts.length > 0) {
				setStoreId(storefronts[0].id);
				setStoreName(storefronts[0].name);
			}
			setProducts(productData.products ?? []);
			setProfile(profileData);
		} catch {
			setLoadError(true);
		}
	}, [ENV, token]);

	useEffect(() => {
		loadProducts();
	}, [loadProducts]);

	const handleProductAdded = useCallback(() => {
		setActiveTab("products");
		loadProducts();
	}, [loadProducts]);

	return (
		<div className="settings-layout">
			<div className="settings-form">
				<h1 className="text-2xl font-bold tracking-tight">Products</h1>
				<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
					Manage your digital products and posts.
				</p>

				<Separator className="my-6" />

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList>
						<TabsTrigger value="products">Products</TabsTrigger>
						<TabsTrigger value="add-product">Add Product</TabsTrigger>
						<TabsTrigger value="posts">Posts</TabsTrigger>
					</TabsList>

					<TabsContent value="products" className="mt-6">
						<ProductsTab
							products={products}
							loading={products === null && !loadError}
							loadError={loadError}
							onReload={loadProducts}
							env={ENV}
							token={token}
						/>
					</TabsContent>

					<TabsContent value="add-product" className="mt-6">
						{storeId ? (
							<AddProductTab storeId={storeId} env={ENV} token={token} onProductAdded={handleProductAdded} />
						) : (
							<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
								{loadError ? "Failed to load store." : "Loading store..."}
							</p>
						)}
					</TabsContent>

					<TabsContent value="posts" className="mt-6">
						{storeId ? (
							<PostsTab storeId={storeId} env={ENV} token={token} />
						) : (
							<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
								{loadError ? "Failed to load store." : "Loading store..."}
							</p>
						)}
					</TabsContent>
				</Tabs>
			</div>

			<aside className="settings-preview hidden lg:flex">
				<PagePreview
					products={products ?? []}
					profile={profile}
					storeName={storeName}
				/>
			</aside>
		</div>
	);
}
