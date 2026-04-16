import type { PresetName } from "~/features/creator-page/lib/theming";

interface ThemePresetPickerProps {
	activePreset: PresetName;
	onSelect: (preset: PresetName) => void;
}

const ThumbRow = ({ type, color, borderColor, width = "55%" }: { type: "hairline" | "box" | "round"; color: string; borderColor?: string; width?: string }) => {
	if (type === "hairline") {
		return (
			<div className="flex w-[90%] shrink-0 items-center border-b pl-0.5" style={{ height: 7, borderColor: borderColor ?? "rgba(0,0,0,0.1)" }}>
				<div className="h-0.5 rounded-sm" style={{ width, background: color }} />
			</div>
		);
	}
	if (type === "box") {
		return (
			<div className="mb-[3px] flex w-[90%] shrink-0 items-center rounded-sm pl-[3px]" style={{ height: 8, background: borderColor, border: `0.5px solid ${color}` }}>
				<div className="h-0.5 rounded-sm" style={{ width, background: color }} />
			</div>
		);
	}
	return (
		<div className="mb-[3px] flex w-[90%] shrink-0 items-center rounded-md pl-[3px]" style={{ height: 8, border: `0.5px solid ${borderColor}` }}>
			<div className="h-0.5 rounded-sm" style={{ width, background: color }} />
		</div>
	);
};

export const ThemePresetPicker = ({ activePreset, onSelect }: ThemePresetPickerProps) => {
	const btnBase = "flex flex-col items-center gap-1.5 rounded-lg border-2 p-0 bg-transparent cursor-pointer transition-all text-[0.7rem] font-medium";

	return (
		<div className="flex flex-wrap gap-2.5">
			{/* Custom */}
			<button
				type="button"
				className={`${btnBase} ${activePreset === "custom" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)]"}`}
				onClick={() => onSelect("custom")}
				aria-label="Custom theme"
			>
				<div
					className="flex h-[120px] w-[90px] items-center justify-center overflow-hidden rounded-xl border"
					style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
						<path d="M12 2.7a1 1 0 011 0l7.8 4.5a1 1 0 01.5.87v9a1 1 0 01-.5.87L13 22.3a1 1 0 01-1 0l-7.8-4.5a1 1 0 01-.5-.87v-9a1 1 0 01.5-.87z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				</div>
				<span>Custom</span>
			</button>

			{/* Ghost */}
			<button
				type="button"
				className={`${btnBase} ${activePreset === "ghost" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)]"}`}
				onClick={() => onSelect("ghost")}
				aria-label="Ghost theme"
			>
				<div className="flex h-[120px] w-[90px] flex-col items-center overflow-hidden rounded-xl border px-2.5 pt-3" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
					<div className="mb-1 h-[18px] w-[18px] shrink-0 rounded-full" style={{ background: "#e0e0e0" }} />
					<div className="mb-[3px] h-[3px] w-1/2 shrink-0 rounded-sm" style={{ background: "#111" }} />
					<div className="mb-1.5 h-0.5 w-[65%] shrink-0 rounded-sm opacity-40" style={{ background: "#111" }} />
					<ThumbRow type="hairline" color="#111" width="55%" />
					<ThumbRow type="hairline" color="#111" width="45%" />
					<ThumbRow type="hairline" color="#111" width="35%" />
					<ThumbRow type="hairline" color="#111" width="40%" />
				</div>
				<span>Ghost</span>
			</button>

			{/* Ink */}
			<button
				type="button"
				className={`${btnBase} ${activePreset === "ink" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)]"}`}
				onClick={() => onSelect("ink")}
				aria-label="Ink theme"
			>
				<div className="flex h-[120px] w-[90px] flex-col items-center overflow-hidden rounded-xl border px-2.5 pt-3" style={{ background: "#0a0a0a", borderColor: "#2a2a2a" }}>
					<div className="mb-1 h-[18px] w-[18px] shrink-0 rounded-full" style={{ background: "#333" }} />
					<div className="mb-[3px] h-[3px] w-1/2 shrink-0 rounded-sm" style={{ background: "#ddd" }} />
					<div className="mb-1.5 h-0.5 w-[65%] shrink-0 rounded-sm opacity-40" style={{ background: "#ddd" }} />
					<ThumbRow type="box" color="#333" borderColor="#151515" width="60%" />
					<ThumbRow type="box" color="#333" borderColor="#151515" width="50%" />
					<ThumbRow type="box" color="#333" borderColor="#151515" width="40%" />
					<ThumbRow type="box" color="#333" borderColor="#151515" width="55%" />
				</div>
				<span>Ink</span>
			</button>

			{/* Paper */}
			<button
				type="button"
				className={`${btnBase} ${activePreset === "paper" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)]"}`}
				onClick={() => onSelect("paper")}
				aria-label="Paper theme"
			>
				<div className="flex h-[120px] w-[90px] flex-col items-center overflow-hidden rounded-xl border px-2.5 pt-3" style={{ background: "#faf7f2", borderColor: "#e5e0d8" }}>
					<div className="mb-1 h-[18px] w-[18px] shrink-0 rounded-full" style={{ background: "#d5d0c8" }} />
					<div className="mb-[3px] h-[3px] w-1/2 shrink-0 rounded-sm" style={{ background: "#1a1a18" }} />
					<div className="mb-1.5 h-0.5 w-[65%] shrink-0 rounded-sm opacity-40" style={{ background: "#1a1a18" }} />
					<ThumbRow type="hairline" color="#1a1a18" borderColor="rgba(26,26,24,0.15)" width="55%" />
					<ThumbRow type="hairline" color="#1a1a18" borderColor="rgba(26,26,24,0.15)" width="50%" />
					<ThumbRow type="hairline" color="#1a1a18" borderColor="rgba(26,26,24,0.15)" width="42%" />
					<ThumbRow type="hairline" color="#1a1a18" borderColor="rgba(26,26,24,0.15)" width="48%" />
				</div>
				<span>Paper</span>
			</button>
		</div>
	);
};
