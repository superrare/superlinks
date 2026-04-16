import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { ThemePresetPicker } from "./theme-preset-picker";
import {
	THEME_PRESETS,
	detectActivePreset,
	type PresetName,
	type PresetTheme,
	type ThemeConfig,
} from "~/features/creator-page/lib/theming";

const FONTS = [
	"Inter", "Switzer", "JetBrains Mono", "Instrument Serif",
	"Roboto", "Open Sans", "Montserrat", "Poppins", "Lato",
	"Raleway", "Playfair Display", "Nunito", "Space Grotesk",
	"DM Sans", "Outfit", "Sora", "Crimson Text", "Work Sans",
];

const BTN_FILL_OPTIONS = [
	{ value: "solid", label: "Solid" },
	{ value: "outline", label: "Outline" },
	{ value: "glass", label: "Glass" },
];

const BTN_RADIUS_OPTIONS = [
	{ value: "square", label: "Square" },
	{ value: "round", label: "Round" },
	{ value: "rounder", label: "Rounder" },
	{ value: "full", label: "Pill" },
];

const AVATAR_SIZE_OPTIONS = [
	{ value: "small", label: "S" },
	{ value: "medium", label: "M" },
	{ value: "large", label: "L" },
];

const BG_STYLE_OPTIONS = [
	{ value: "solid", label: "Light" },
	{ value: "dark", label: "Dark" },
];

const WALLPAPER_OPTIONS = [
	{ value: "none", label: "None" },
	{ value: "waves", label: "Waves" },
	{ value: "grid", label: "Grid" },
	{ value: "dots", label: "Dots" },
];

const HEADER_LAYOUT_OPTIONS = [
	{ value: "center", label: "Centered" },
	{ value: "left", label: "Left-aligned" },
];

interface DesignTabProps {
	theme: ThemeConfig | null | undefined;
	onThemeChange: (theme: PresetTheme) => void;
}

const themeToPresetTheme = (t: ThemeConfig | null | undefined): PresetTheme => {
	const cfg = t && typeof t === "object" ? t : {};
	return {
		socialLinksColor: cfg.socialLinksColor ?? cfg.accentColor ?? "#111111",
		bgStyle: cfg.bgStyle ?? "solid",
		bgColor: cfg.bgColor ?? "#ffffff",
		fontFamily: cfg.fontFamily ?? "Inter",
		fontColor: cfg.fontColor ?? "#111111",
		btnFill: cfg.btnFill ?? "solid",
		btnRadius: cfg.btnRadius ?? "round",
		btnColor: cfg.btnColor ?? "#111111",
		btnTextColor: cfg.btnTextColor ?? "#111111",
		wallpaperStyle: cfg.wallpaperStyle ?? "waves",
		avatarSize: cfg.avatarSize ?? "medium",
		avatarShadowColor: cfg.avatarShadowColor ?? "",
		headerLayout: cfg.headerLayout ?? "center",
	};
};

export const DesignTab = ({ theme, onThemeChange }: DesignTabProps) => {
	const fetcher = useFetcher();
	const savedThemeRef = useRef<PresetTheme>(themeToPresetTheme(theme));

	const [fields, setFields] = useState<PresetTheme>(() => themeToPresetTheme(theme));

	const activePreset = useMemo(() => detectActivePreset(fields), [fields]);

	const updateField = useCallback(<K extends keyof PresetTheme>(key: K, value: PresetTheme[K]) => {
		setFields((prev) => {
			const next = { ...prev, [key]: value };
			onThemeChange(next);
			return next;
		});
	}, [onThemeChange]);

	const handlePresetSelect = useCallback((name: PresetName) => {
		if (name === "custom") {
			setFields(savedThemeRef.current);
			onThemeChange(savedThemeRef.current);
			return;
		}
		const preset = THEME_PRESETS[name];
		if (!preset) return;
		setFields({ ...preset });
		onThemeChange({ ...preset });
	}, [onThemeChange]);

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data) {
			const result = fetcher.data as { ok?: boolean; error?: string };
			if (result.ok) {
				savedThemeRef.current = { ...fields };
				toast.success("Theme saved");
			} else if (result.error) {
				toast.error(result.error);
			}
		}
	}, [fetcher.state, fetcher.data, fields]);

	const handleSave = () => {
		const formData = new FormData();
		formData.set("intent", "update-profile");
		formData.set("theme", JSON.stringify(fields));
		fetcher.submit(formData, { method: "post" });
	};

	return (
		<div className="space-y-8">
			{/* Preset picker */}
			<section className="space-y-3">
				<Label>Theme</Label>
				<ThemePresetPicker activePreset={activePreset} onSelect={handlePresetSelect} />
			</section>

			{/* Header layout */}
			<section className="space-y-3">
				<Label>Header Layout</Label>
				<div className="flex gap-2">
					{HEADER_LAYOUT_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => updateField("headerLayout", opt.value)}
							className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
								fields.headerLayout === opt.value
									? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
									: "border-[var(--border)] hover:border-[var(--text)]"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</section>

			{/* Avatar */}
			<section className="space-y-3">
				<Label>Avatar Size</Label>
				<div className="flex gap-2">
					{AVATAR_SIZE_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => updateField("avatarSize", opt.value)}
							className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
								fields.avatarSize === opt.value
									? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
									: "border-[var(--border)] hover:border-[var(--text)]"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>

				<div className="flex items-center gap-3">
					<Label className="shrink-0">Avatar Shadow</Label>
					<Input
						type="color"
						className="h-8 w-10 cursor-pointer rounded border-0 p-0"
						value={fields.avatarShadowColor || "#111111"}
						onChange={(e) => updateField("avatarShadowColor", e.target.value)}
					/>
					<Input
						className="w-24 font-mono text-xs"
						value={fields.avatarShadowColor}
						onChange={(e) => updateField("avatarShadowColor", e.target.value)}
						placeholder="none"
					/>
				</div>
			</section>

			{/* Button style */}
			<section className="space-y-3">
				<Label>Button Style</Label>
				<div className="flex gap-2">
					{BTN_FILL_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => updateField("btnFill", opt.value)}
							className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
								fields.btnFill === opt.value
									? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
									: "border-[var(--border)] hover:border-[var(--text)]"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>

				<Label>Button Corners</Label>
				<div className="flex gap-2">
					{BTN_RADIUS_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => updateField("btnRadius", opt.value)}
							className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
								fields.btnRadius === opt.value
									? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
									: "border-[var(--border)] hover:border-[var(--text)]"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<Label className="text-xs">Button Color</Label>
						<div className="flex items-center gap-2">
							<Input
								type="color"
								className="h-8 w-10 cursor-pointer rounded border-0 p-0"
								value={fields.btnColor || "#111111"}
								onChange={(e) => updateField("btnColor", e.target.value)}
							/>
							<Input
								className="flex-1 font-mono text-xs"
								value={fields.btnColor}
								onChange={(e) => updateField("btnColor", e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Button Text</Label>
						<div className="flex items-center gap-2">
							<Input
								type="color"
								className="h-8 w-10 cursor-pointer rounded border-0 p-0"
								value={fields.btnTextColor || "#111111"}
								onChange={(e) => updateField("btnTextColor", e.target.value)}
							/>
							<Input
								className="flex-1 font-mono text-xs"
								value={fields.btnTextColor}
								onChange={(e) => updateField("btnTextColor", e.target.value)}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Font */}
			<section className="space-y-3">
				<Label>Font</Label>
				<Select value={fields.fontFamily} onValueChange={(v) => updateField("fontFamily", v)}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{FONTS.map((f) => (
							<SelectItem key={f} value={f} style={{ fontFamily: f }}>
								{f}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex items-center gap-3">
					<Label className="shrink-0 text-xs">Font Color</Label>
					<Input
						type="color"
						className="h-8 w-10 cursor-pointer rounded border-0 p-0"
						value={fields.fontColor || "#111111"}
						onChange={(e) => updateField("fontColor", e.target.value)}
					/>
					<Input
						className="w-24 font-mono text-xs"
						value={fields.fontColor}
						onChange={(e) => updateField("fontColor", e.target.value)}
					/>
				</div>
			</section>

			{/* Social links color */}
			<section className="space-y-3">
				<Label>Social Links Color</Label>
				<div className="flex items-center gap-3">
					<Input
						type="color"
						className="h-8 w-10 cursor-pointer rounded border-0 p-0"
						value={fields.socialLinksColor || "#111111"}
						onChange={(e) => updateField("socialLinksColor", e.target.value)}
					/>
					<Input
						className="w-24 font-mono text-xs"
						value={fields.socialLinksColor}
						onChange={(e) => updateField("socialLinksColor", e.target.value)}
					/>
				</div>
			</section>

			{/* Background */}
			<section className="space-y-3">
				<Label>Background</Label>
				<Select value={fields.bgStyle} onValueChange={(v) => updateField("bgStyle", v)}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{BG_STYLE_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex items-center gap-3">
					<Label className="shrink-0 text-xs">Background Color</Label>
					<Input
						type="color"
						className="h-8 w-10 cursor-pointer rounded border-0 p-0"
						value={fields.bgColor || "#ffffff"}
						onChange={(e) => updateField("bgColor", e.target.value)}
					/>
					<Input
						className="w-24 font-mono text-xs"
						value={fields.bgColor}
						onChange={(e) => updateField("bgColor", e.target.value)}
					/>
				</div>
			</section>

			{/* Wallpaper */}
			<section className="space-y-3">
				<Label>Wallpaper</Label>
				<div className="flex gap-2">
					{WALLPAPER_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => updateField("wallpaperStyle", opt.value)}
							className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
								fields.wallpaperStyle === opt.value
									? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
									: "border-[var(--border)] hover:border-[var(--text)]"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</section>

			{/* Save */}
			<Button onClick={handleSave} disabled={fetcher.state !== "idle"} className="w-full">
				{fetcher.state !== "idle" ? "Saving..." : "Save Theme"}
			</Button>
		</div>
	);
};
