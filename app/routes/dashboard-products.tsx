import type { Route } from "./+types/dashboard-products";
import { requireAuth, withHeaders } from "~/features/auth/server/auth.server";
import { getEnv } from "~/lib/env.server";
import { callCommerce } from "~/lib/commerce.server";
import { Separator } from "~/components/ui/separator";
import { useState, useEffect } from "react";

interface Product {
	id: string;
	title: string;
	price: string;
	content_type: string;
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

export default function DashboardProductsRoute({ loaderData }: Route.ComponentProps) {
	const { token, ENV } = loaderData;
	const [products, setProducts] = useState<Product[] | null>(null);

	useEffect(() => {
		fetch(`${ENV.SUPABASE_URL}/functions/v1/commerce`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
				"x-user-token": token,
			},
			body: JSON.stringify({ action: "my-products" }),
		})
			.then((r) => r.json())
			.then((d) => setProducts(d.products ?? []));
	}, [token, ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY]);

	return (
		<div className="max-w-2xl">
			<h1 className="text-2xl font-bold tracking-tight">Products</h1>
			<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
				Manage your digital products and posts.
			</p>

			<Separator className="my-6" />

			{products === null ? (
				<ProductSkeleton />
			) : products.length === 0 ? (
				<div
					className="rounded-xl border border-dashed p-10 text-center text-sm"
					style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
				>
					No products yet. Use the SuperLinks commerce tools to create your first product.
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{products.map((p) => (
						<div
							key={p.id}
							className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
							style={{ borderColor: "var(--border)", background: "var(--card)" }}
						>
							<span className="text-base" aria-hidden="true">
								{CONTENT_TYPE_EMOJI[p.content_type] ?? "📦"}
							</span>
							<span className="flex-1 font-medium truncate">{p.title}</span>
							<span
								className="shrink-0 text-xs font-medium"
								style={{ color: "var(--text-secondary)" }}
							>
								{parseFloat(p.price) === 0 ? "Free" : `${p.price} USDC`}
							</span>
							<span
								className="shrink-0 rounded-full px-2 py-0.5 text-xs capitalize"
								style={{ background: "var(--muted)", color: "var(--text-secondary)" }}
							>
								{p.content_type}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
