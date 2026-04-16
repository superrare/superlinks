import { useState } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

interface CheckoutModalProps {
	displayName: string;
	username: string;
}

const CheckoutModal = ({ displayName, username }: CheckoutModalProps) => {
	const [visible, setVisible] = useState(false);
	const [step, setStep] = useState(0);
	const [productId, setProductId] = useState("");
	const [productTitle, setProductTitle] = useState("");
	const [productPrice, setProductPrice] = useState("");
	const [productType, setProductType] = useState("");

	const STEP_LABELS = ["PRODUCT", "CONFIRM", "PAYMENT", "DONE"];

	const handleOpen = (el: HTMLElement) => {
		setProductId(el.dataset.productId ?? "");
		setProductTitle(el.dataset.productTitle ?? "");
		setProductPrice(el.dataset.productPrice ?? "");
		setProductType(el.dataset.productType ?? "");
		setStep(0);
		setVisible(true);
		document.body.style.overflow = "hidden";
	};

	const handleClose = () => {
		setVisible(false);
		document.body.style.overflow = "";
	};

	const handlePurchase = async () => {
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
	};

	// Bind to shop product buttons via event delegation
	if (typeof document !== "undefined") {
		document.addEventListener("click", (e) => {
			const target = (e.target as HTMLElement).closest(".lt-shop-product") as HTMLElement | null;
			if (target) handleOpen(target);
		}, { once: false });
	}

	if (!visible) return null;

	return (
		<div
			className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-sm transition-opacity"
			onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
			role="dialog"
			aria-modal="true"
			aria-label="Checkout"
		>
			<div className="w-[96vw] max-w-[480px] rounded-[20px] bg-white p-7">
				<div className="mb-3 flex items-center justify-between">
					<div>
						<div className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">
							{STEP_LABELS[step]}
						</div>
						<div className="text-2xl font-extrabold">{productPrice} USDC</div>
					</div>
					<button
						className="flex h-9 w-9 items-center justify-center rounded-full border text-lg text-gray-500 hover:bg-gray-50"
						onClick={handleClose}
						aria-label="Close"
					>
						×
					</button>
				</div>

				<div className="mb-6 flex gap-2">
					{[0, 1, 2, 3].map((i) => (
						<span
							key={i}
							className={`h-2 w-2 rounded-full transition-all ${
								i < step ? "bg-emerald-500" : i === step ? "scale-125 bg-black" : "bg-gray-200"
							}`}
						/>
					))}
				</div>

				{step === 0 && (
					<div className="animate-fade-in">
						<table className="mb-4 w-full text-sm">
							<tbody>
								<tr className="border-b border-gray-100"><td className="py-2.5 text-gray-500">Item</td><td className="py-2.5 text-right font-medium">{productTitle}</td></tr>
								<tr className="border-b border-gray-100"><td className="py-2.5 text-gray-500">Format</td><td className="py-2.5 text-right font-medium">Digital Download</td></tr>
								<tr><td className="py-2.5 text-gray-500">Price</td><td className="py-2.5 text-right font-bold">${productPrice} <span className="text-xs text-gray-500">(USDC)</span></td></tr>
							</tbody>
						</table>
						<div className="mb-5 flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
							<span>🔒 x402 protocol</span><span>⚡ Instant delivery</span><span>⛽ Gasless</span>
						</div>
						<button className="w-full rounded-[14px] bg-black py-4 text-sm font-bold text-white transition-colors hover:bg-gray-900" onClick={() => setStep(1)}>Buy Now — {productPrice} USDC</button>
						<button className="mt-2 w-full py-3 text-sm text-gray-500 hover:text-black" onClick={handleClose}>Maybe later</button>
					</div>
				)}

				{step === 1 && (
					<div className="animate-fade-in">
						<h3 className="mb-1 text-lg font-bold">Confirm purchase</h3>
						<p className="mb-5 text-sm text-gray-500">No wallet connection or signing required.</p>
						<button className="w-full rounded-[14px] bg-black py-4 text-sm font-bold text-white transition-colors hover:bg-gray-900" onClick={handlePurchase}>Purchase</button>
						<button className="mt-2 w-full py-3 text-sm text-gray-500 hover:text-black" onClick={() => setStep(0)}>← Back</button>
					</div>
				)}

				{step === 2 && (
					<div className="animate-fade-in py-8 text-center">
						<div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-3 border-gray-200 border-t-black" />
						<h3 className="mb-1 text-lg font-bold">Processing payment</h3>
						<p className="text-sm text-gray-500">Settling on Base via x402.</p>
					</div>
				)}

				{step === 3 && (
					<div className="animate-fade-in py-8 text-center">
						<div className="mb-4 text-4xl">✓</div>
						<h3 className="mb-1 text-lg font-bold">Payment confirmed</h3>
						<p className="mb-5 text-sm text-gray-500">Your download is ready.</p>
						<button className="w-full rounded-[14px] bg-black py-4 text-sm font-bold text-white" onClick={handleClose}>Return to profile</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default CheckoutModal;
