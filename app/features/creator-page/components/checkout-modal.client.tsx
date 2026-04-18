import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

interface CheckoutModalProps {
	displayName: string;
	username: string;
}

const CheckoutModal = ({ displayName, username }: CheckoutModalProps) => {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState(0);
	const [productId, setProductId] = useState("");
	const [productTitle, setProductTitle] = useState("");
	const [productPrice, setProductPrice] = useState("");

	const STEP_LABELS = ["PRODUCT", "CONFIRM", "PAYMENT", "DONE"];

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const target = (e.target as HTMLElement).closest("[data-product-id]") as HTMLElement | null;
			if (!target) return;
			setProductId(target.dataset.productId ?? "");
			setProductTitle(target.dataset.productTitle ?? "");
			setProductPrice(target.dataset.productPrice ?? "");
			setStep(0);
			setOpen(true);
		};

		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	}, []);

	const handlePurchase = useCallback(async () => {
		setStep(2);
		try {
			const supabase = getSupabaseBrowserClient();
			const { data: { session } } = await supabase.auth.getSession();
			const token = session?.access_token ?? "";
			const env = (window as unknown as { ENV: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string } }).ENV;

			const res = await fetch(`${env.SUPABASE_URL}/functions/v1/commerce`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
					"x-user-token": token,
				},
				body: JSON.stringify({ action: "buy", productId }),
			});

			if (!res.ok) {
				const errData: Record<string, unknown> = await res.json();
				if (typeof errData.error === "string" && errData.error.includes("Already purchased")) {
					setStep(3);
					return;
				}
				throw new Error((errData.error as string) ?? "Purchase failed");
			}

			setStep(3);
		} catch (err) {
			console.error("Purchase error:", err);
			setStep(0);
		}
	}, [productId]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-[480px]" aria-describedby="checkout-desc">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<div>
							<div className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
								{STEP_LABELS[step]}
							</div>
							<DialogTitle className="text-2xl font-extrabold">{productPrice} USDC</DialogTitle>
						</div>
					</div>
				</DialogHeader>

				<div id="checkout-desc" className="mb-4 flex gap-2">
					{[0, 1, 2, 3].map((i) => (
						<span
							key={i}
							className={`h-2 w-2 rounded-full transition-all ${
								i < step ? "bg-emerald-500" : i === step ? "scale-125 bg-[var(--text)]" : "bg-[var(--border)]"
							}`}
						/>
					))}
				</div>

				{step === 0 && (
					<div className="animate-fade-in">
						<table className="mb-4 w-full text-sm">
							<tbody>
								<tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}><td className="py-2.5 text-[var(--text-secondary)]">Item</td><td className="py-2.5 text-right font-medium">{productTitle}</td></tr>
								<tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}><td className="py-2.5 text-[var(--text-secondary)]">Format</td><td className="py-2.5 text-right font-medium">Digital Download</td></tr>
								<tr><td className="py-2.5 text-[var(--text-secondary)]">Price</td><td className="py-2.5 text-right font-bold">${productPrice} <span className="text-xs text-[var(--text-tertiary)]">(USDC)</span></td></tr>
							</tbody>
						</table>
						<Button className="w-full" onClick={() => setStep(1)}>Buy Now — {productPrice} USDC</Button>
						<Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>Maybe later</Button>
					</div>
				)}

				{step === 1 && (
					<div className="animate-fade-in">
						<h3 className="mb-1 text-lg font-bold">Confirm purchase</h3>
						<p className="mb-5 text-sm text-[var(--text-secondary)]">Review the details below. No wallet connection or message signing required.</p>
						<Button className="w-full" onClick={handlePurchase}>Purchase</Button>
						<Button variant="ghost" className="mt-2 w-full" onClick={() => setStep(0)}>Back</Button>
					</div>
				)}

				{step === 2 && (
					<div className="animate-fade-in py-8 text-center">
						<div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-3 border-[var(--border)] border-t-[var(--text)]" />
						<h3 className="mb-1 text-lg font-bold">Processing payment</h3>
						<p className="text-sm text-[var(--text-secondary)]">Settling on Base via x402. This only takes a moment.</p>
					</div>
				)}

				{step === 3 && (
					<div className="animate-fade-in py-8 text-center">
						<div className="mb-4 text-4xl">✓</div>
						<h3 className="mb-1 text-lg font-bold">Payment confirmed</h3>
						<p className="mb-5 text-sm text-[var(--text-secondary)]">Your download is ready. The transaction has been settled on Base.</p>
						<Button className="w-full" onClick={() => setOpen(false)}>Return to profile</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default CheckoutModal;
