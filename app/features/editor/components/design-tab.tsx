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

const GOOGLE_FONTS = FONTS.filter((f) => !["Inter", "Switzer", "JetBrains Mono", "Instrument Serif"].includes(f));

const loadGoogleFont = (family: string) => {
	const id = `gf-${family.replace(/\s+/g, "-")}`;
	if (typeof document === "undefined" || document.getElementById(id)) return;
	const link = document.createElement("link");
	link.id = id;
	link.rel = "stylesheet";
	link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600&display=swap`;
	document.head.appendChild(link);
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const BTN_FILL_OPTIONS = [
	{ value: "solid", label: "Solid" },
	{ value: "outline", label: "Outline" },
	{ value: "glass", label: "Glass" },
];

const BTN_RADIUS_OPTIONS = [
	{ value: "square", label: "Square" },
	{ value: "round", label: "Round" },
	{ value: "rounder", label: "Rounder" },
	{ value: "full", label: "Full" },
];

const AVATAR_SIZE_OPTIONS = [
	{ value: "small", label: "Small" },
	{ value: "medium", label: "Medium" },
	{ value: "large", label: "Large" },
];

const BG_STYLE_OPTIONS = [
	{ value: "solid", label: "Solid" },
	{ value: "gradient", label: "Gradient" },
	{ value: "dark", label: "Dark Mode" },
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

interface ToggleGroupProps {
	options: Array<{ value: string; label: string }>;
	value: string;
	onChange: (value: string) => void;
	compact?: boolean;
}

const ToggleGroup = ({ options, value, onChange, compact }: ToggleGroupProps) => (
	<div className="flex gap-2">
		{options.map((opt) => (
			<button
				key={opt.value}
				type="button"
				onClick={() => onChange(opt.value)}
				className={`rounded-lg border text-sm font-medium transition-colors ${
					compact ? "flex h-9 w-9 items-center justify-center font-semibold" : "px-4 py-2"
				} ${
					value === opt.value
						? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
						: "border-[var(--border)] hover:border-[var(--text)]"
				}`}
			>
				{opt.label}
			</button>
		))}
	</div>
);

interface ColorFieldProps {
	label: string;
	value: string;
	fallback?: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

const ColorField = ({ label, value, fallback = "#111111", onChange, placeholder }: ColorFieldProps) => {
	const [hex, setHex] = useState(value);

	useEffect(() => {
		setHex(value);
	}, [value]);

	const handleHexBlur = () => {
		if (hex === "" && placeholder) {
			onChange("");
			return;
		}
		if (HEX_RE.test(hex)) {
			onChange(hex);
		} else {
			setHex(value);
		}
	};

	return (
		<div className="flex items-center gap-3">
			<Label className="shrink-0 text-xs">{label}</Label>
			<Input
				type="color"
				className="h-8 w-10 cursor-pointer rounded border-0 p-0"
				value={value || fallback}
				onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
			/>
			<Input
				className="w-24 font-mono text-xs"
				value={hex}
				onChange={(e) => setHex(e.target.value)}
				onBlur={handleHexBlur}
				onKeyDown={(e) => { if (e.key === "Enter") handleHexBlur(); }}
				placeholder={placeholder}
			/>
		</div>
	);
};

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
		btnFill: cfg.btnFill ?? (cfg.btnStyle === "outline" ? "outline" : "solid"),
		btnRadius: cfg.btnRadius ?? "round",
		btnColor: cfg.btnColor ?? cfg.accentColor ?? "#111111",
		btnTextColor: cfg.btnTextColor ?? "#111111",
		wallpaperStyle: cfg.wallpaperStyle ?? (cfg.wallpaper === false ? "none" : "waves"),
		avatarSize: cfg.avatarSize ?? "medium",
		avatarShadowColor: cfg.avatarShadowColor ?? "",
		headerLayout: cfg.headerLayout ?? "center",
	};
};

export const DesignTab = ({ theme, onThemeChange }: DesignTabProps) => {
	const fetcher = useFetcher();
	const savedThemeRef = useRef<PresetTheme>(themeToPresetTheme(theme));
	const pendingFieldsRef = useRef<PresetTheme | null>(null);

	const [fields, setFields] = useState<PresetTheme>(() => themeToPresetTheme(theme));

	const activePreset = useMemo(() => detectActivePreset(fields), [fields]);

	useEffect(() => {
		GOOGLE_FONTS.forEach(loadGoogleFont);
	}, []);

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
			if (result.ok && pendingFieldsRef.current) {
				savedThemeRef.current = pendingFieldsRef.current;
				pendingFieldsRef.current = null;
				toast.success("Theme saved");
			} else if (result.error) {
				pendingFieldsRef.current = null;
				toast.error(result.error);
			}
		}
	}, [fetcher.state, fetcher.data]);

	const handleSave = () => {
		pendingFieldsRef.current = { ...fields };
		const formData = new FormData();
		formData.set("intent", "update-profile");
		formData.set("theme", JSON.stringify(fields));
		fetcher.submit(formData, { method: "post" });
	};

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h3 className="text-base font-semibold">Link Page Theme</h3>
				<p className="text-xs" style={{ color: "var(--text-secondary)" }}>Customize how your public link page looks.</p>
				<Label>Theme</Label>
				<ThemePresetPicker activePreset={activePreset} onSelect={handlePresetSelect} />
			</section>

			<section className="space-y-3">
				<Label>Header Layout</Label>
				<ToggleGroup options={HEADER_LAYOUT_OPTIONS} value={fields.headerLayout} onChange={(v) => updateField("headerLayout", v)} />
			</section>

			<section className="space-y-3">
				<Label>Avatar size</Label>
				<ToggleGroup options={AVATAR_SIZE_OPTIONS} value={fields.avatarSize} onChange={(v) => updateField("avatarSize", v)} />
				<ColorField label="Avatar shadow color" value={fields.avatarShadowColor} onChange={(v) => updateField("avatarShadowColor", v)} placeholder="none" />
			</section>

			<section className="space-y-3">
				<Label>Button style</Label>
				<ToggleGroup options={BTN_FILL_OPTIONS} value={fields.btnFill} onChange={(v) => updateField("btnFill", v)} />

				<Label>Corner roundness</Label>
				<ToggleGroup options={BTN_RADIUS_OPTIONS} value={fields.btnRadius} onChange={(v) => updateField("btnRadius", v)} />

				<div className="grid grid-cols-2 gap-3">
					<ColorField label="Button color" value={fields.btnColor} onChange={(v) => updateField("btnColor", v)} />
					<ColorField label="Button text color" value={fields.btnTextColor} onChange={(v) => updateField("btnTextColor", v)} />
				</div>
			</section>

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
				<ColorField label="Text Color" value={fields.fontColor} onChange={(v) => updateField("fontColor", v)} />
			</section>

			<section className="space-y-3">
				<Label>Social links color</Label>
				<ColorField label="Color" value={fields.socialLinksColor} onChange={(v) => updateField("socialLinksColor", v)} />
			</section>

			<section className="space-y-3">
				<Label>Background Style</Label>
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
				<ColorField label="Background Color" value={fields.bgColor} fallback="#ffffff" onChange={(v) => updateField("bgColor", v)} />
			</section>

			<section className="space-y-3">
				<Label>Wallpaper Style</Label>
				<ToggleGroup options={WALLPAPER_OPTIONS} value={fields.wallpaperStyle} onChange={(v) => updateField("wallpaperStyle", v)} />
			</section>

			<Button onClick={handleSave} disabled={fetcher.state !== "idle"} className="w-full">
				{fetcher.state !== "idle" ? "Saving..." : "Save Theme"}
			</Button>
		</div>
	);
};
