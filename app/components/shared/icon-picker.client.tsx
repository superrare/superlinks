import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const EMOJI_DATA = [
	"🔗", "🌐", "📱", "💻", "🎵", "🎬", "📸", "🎮", "📚", "✍️",
	"🎨", "🛒", "💰", "🏠", "📧", "📞", "🗓", "📍", "🎓", "💡",
	"🚀", "⭐", "❤️", "🔥", "💎", "🎯", "🏆", "🌟", "🦄", "🌈",
	"☕", "🍕", "🎸", "🎤", "📺", "🎪", "💼", "🔧", "📦", "🎁",
];

interface IconPickerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (icon: string | null) => void;
	giphyApiKey?: string;
}

export const IconPicker = ({ open, onOpenChange, onSelect, giphyApiKey }: IconPickerProps) => {
	const [search, setSearch] = useState("");
	const [gifUrl, setGifUrl] = useState("");
	const [gifs, setGifs] = useState<Array<{ id: string; url: string; preview: string }>>([]);
	const [gifSearch, setGifSearch] = useState("");
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const filteredEmojis = search
		? EMOJI_DATA.filter(() => true)
		: EMOJI_DATA;

	const fetchGifs = useCallback(async (query?: string) => {
		if (!giphyApiKey) return;
		const endpoint = query
			? `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(query)}&limit=20&rating=g`
			: `https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=20&rating=g`;

		try {
			const res = await fetch(endpoint);
			const data: Record<string, any> = await res.json();
			setGifs(
				((data.data as any[]) ?? []).map((g: any) => ({
					id: g.id,
					url: g.images?.fixed_height?.url ?? g.images?.original?.url ?? "",
					preview: g.images?.fixed_height_small?.url ?? g.images?.preview_gif?.url ?? "",
				})),
			);
		} catch { setGifs([]); }
	}, [giphyApiKey]);

	const handleGifSearch = (value: string) => {
		setGifSearch(value);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => fetchGifs(value || undefined), 400);
	};

	const handleTabChange = (value: string) => {
		if (value === "gifs" && gifs.length === 0 && giphyApiKey) void fetchGifs();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Choose an icon</DialogTitle>
				</DialogHeader>

				<Tabs defaultValue="icons" onValueChange={handleTabChange}>
					<TabsList className="w-full">
						<TabsTrigger value="icons" className="flex-1">Icons</TabsTrigger>
						<TabsTrigger value="gifs" className="flex-1">GIFs</TabsTrigger>
					</TabsList>

					<TabsContent value="icons" className="mt-4">
						<Input
							placeholder="Search icons..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="mb-3"
						/>
						<div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
							{filteredEmojis.map((emoji) => (
								<button
									key={emoji}
									className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-[var(--accent-subtle)]"
									onClick={() => { onSelect(emoji); onOpenChange(false); }}
									type="button"
								>
									{emoji}
								</button>
							))}
						</div>
						<div className="mt-3 flex gap-2">
							<Button variant="outline" size="sm" onClick={() => { onSelect(""); onOpenChange(false); }}>Remove icon</Button>
							<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
						</div>
					</TabsContent>

					<TabsContent value="gifs" className="mt-4">
						{giphyApiKey ? (
							<>
								<Input
									placeholder="Search GIFs..."
									value={gifSearch}
									onChange={(e) => handleGifSearch(e.target.value)}
									className="mb-3"
								/>
								<div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
									{gifs.map((gif) => (
										<button
											key={gif.id}
											className="overflow-hidden rounded-lg transition-transform hover:scale-105"
											onClick={() => { onSelect(gif.url); onOpenChange(false); }}
											type="button"
										>
											<img src={gif.preview || gif.url} alt="" className="h-20 w-full object-cover" loading="lazy" />
										</button>
									))}
								</div>
								<p className="mt-2 text-center text-[0.65rem]" style={{ color: "var(--text-tertiary)" }}>Powered by GIPHY</p>
							</>
						) : (
							<div className="space-y-3">
								<p className="text-sm" style={{ color: "var(--text-secondary)" }}>Paste a GIF URL:</p>
								<Input placeholder="https://media.giphy.com/..." value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} />
								{gifUrl && <img src={gifUrl} alt="Preview" className="h-20 rounded-lg object-cover" />}
								<Button size="sm" onClick={() => { if (gifUrl) { onSelect(gifUrl); onOpenChange(false); } }} disabled={!gifUrl}>
									Use GIF
								</Button>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
};

export default IconPicker;
