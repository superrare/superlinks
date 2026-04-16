import { useState, useRef, useEffect } from "react";

const QRModal = () => {
	const [visible, setVisible] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendered = useRef(false);

	useEffect(() => {
		const handler = () => { setVisible(true); };
		document.getElementById("lt-qr-btn")?.addEventListener("click", handler);
		return () => document.getElementById("lt-qr-btn")?.removeEventListener("click", handler);
	}, []);

	useEffect(() => {
		if (!visible || rendered.current || !canvasRef.current) return;
		rendered.current = true;
		const canvas = canvasRef.current;
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
	}, [visible]);

	if (!visible) return null;

	return (
		<>
			<div
				className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity"
				onClick={() => setVisible(false)}
			/>
			<div className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-[20px] bg-white px-6 pb-8 pt-3 transition-transform animate-slide-up">
				<div className="mx-auto mb-4 h-1 w-9 rounded-full bg-gray-200" />
				<h3 className="mb-5 text-center text-base font-bold">QR Code</h3>
				<div className="flex justify-center mb-3">
					<canvas ref={canvasRef} width={200} height={200} className="rounded-xl shadow-md" />
				</div>
				<p className="text-center text-xs text-gray-500">Scan to visit this page</p>
			</div>
		</>
	);
};

export default QRModal;
