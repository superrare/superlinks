import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

const QRModal = () => {
	const [open, setOpen] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const btn = document.getElementById("lt-qr-btn");
		if (!btn) return;
		const handler = () => setOpen(true);
		btn.addEventListener("click", handler);
		return () => btn.removeEventListener("click", handler);
	}, []);

	const drawQR = useCallback((canvas: HTMLCanvasElement | null) => {
		if (!canvas) return;
		const size = canvas.width;
		const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(window.location.href)}&margin=1&format=svg`;
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.fillStyle = "#fff";
			ctx.fillRect(0, 0, size, size);
			ctx.drawImage(img, 0, 0, size, size);
		};
		img.src = url;
	}, []);

	useEffect(() => {
		if (open && canvasRef.current) {
			drawQR(canvasRef.current);
		}
	}, [open, drawQR]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-xs" aria-describedby="qr-desc">
				<DialogHeader>
					<DialogTitle>QR Code</DialogTitle>
				</DialogHeader>
				<div className="flex justify-center">
					<canvas ref={canvasRef} width={200} height={200} className="rounded-xl shadow-md" />
				</div>
				<p id="qr-desc" className="text-center text-xs text-[var(--text-tertiary)]">
					Scan to visit this page
				</p>
			</DialogContent>
		</Dialog>
	);
};

export default QRModal;
