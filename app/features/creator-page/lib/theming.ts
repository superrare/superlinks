const DEFAULT_ACCENT = "#111111";

const SAFE_COLOR_RE = /^#[0-9a-fA-F]{3,8}$|^(?:rgb|hsl|oklch)a?\([^)]{1,80}\)$|^[a-zA-Z]{1,20}$/;
const SAFE_FONT_RE = /^[a-zA-Z0-9 ,'-]{1,100}$/;
const VALID_HEADER_LAYOUTS = new Set(["left", "center"]);

const sanitizeColor = (val: string | undefined, fallback: string): string =>
	val && SAFE_COLOR_RE.test(val) ? val : fallback;

const sanitizeFont = (val: string | undefined): string | undefined =>
	val && SAFE_FONT_RE.test(val) ? val : undefined;

export interface ThemeConfig {
	accentColor?: string;
	socialLinksColor?: string;
	bgStyle?: string;
	bgColor?: string;
	btnFill?: string;
	btnRadius?: string;
	btnColor?: string;
	btnTextColor?: string;
	avatarSize?: string;
	avatarShadowColor?: string;
	fontFamily?: string;
	fontColor?: string;
	wallpaperStyle?: string;
	wallpaper?: boolean;
	btnStyle?: string;
	headerLayout?: string;
}

export interface PresetTheme {
	socialLinksColor: string;
	bgStyle: string;
	bgColor: string;
	fontFamily: string;
	fontColor: string;
	btnFill: string;
	btnRadius: string;
	btnColor: string;
	btnTextColor: string;
	wallpaperStyle: string;
	avatarSize: string;
	avatarShadowColor: string;
	headerLayout: string;
}

export const THEME_PRESETS: Record<string, PresetTheme | null> = {
	custom: null,
	ghost: {
		socialLinksColor: "#111111",
		bgStyle: "solid",
		bgColor: "#ffffff",
		fontFamily: "Switzer",
		fontColor: "#111111",
		btnFill: "outline",
		btnRadius: "square",
		btnColor: "#111111",
		btnTextColor: "#111111",
		wallpaperStyle: "none",
		avatarSize: "medium",
		avatarShadowColor: "",
		headerLayout: "center",
	},
	ink: {
		socialLinksColor: "#dddddd",
		bgStyle: "dark",
		bgColor: "#0a0a0a",
		fontFamily: "JetBrains Mono",
		fontColor: "#dddddd",
		btnFill: "outline",
		btnRadius: "square",
		btnColor: "#1c1c1c",
		btnTextColor: "#dddddd",
		wallpaperStyle: "none",
		avatarSize: "medium",
		avatarShadowColor: "",
		headerLayout: "left",
	},
	paper: {
		socialLinksColor: "#1a1a18",
		bgStyle: "solid",
		bgColor: "#faf7f2",
		fontFamily: "Instrument Serif",
		fontColor: "#1a1a18",
		btnFill: "outline",
		btnRadius: "round",
		btnColor: "#1a1a18",
		btnTextColor: "#1a1a18",
		wallpaperStyle: "none",
		avatarSize: "medium",
		avatarShadowColor: "",
		headerLayout: "left",
	},
};

export const PRESET_NAMES = ["custom", "ghost", "ink", "paper"] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

export const detectActivePreset = (current: PresetTheme): PresetName => {
	for (const name of PRESET_NAMES) {
		if (name === "custom") continue;
		const preset = THEME_PRESETS[name];
		if (!preset) continue;

		const match = (Object.keys(preset) as Array<keyof PresetTheme>).every(
			(key) => current[key] === preset[key],
		);
		if (match) return name;
	}
	return "custom";
};

export const resolveThemeVars = (theme: ThemeConfig | null | undefined) => {
	const t = theme && typeof theme === "object" ? theme : {};

	const accentColor = sanitizeColor(t.accentColor, DEFAULT_ACCENT);
	const socialLinksColor = sanitizeColor(t.socialLinksColor, accentColor);
	const bgStyle = t.bgStyle ?? "solid";
	const bgColor = sanitizeColor(t.bgColor, "");
	const effectiveBtnColor = sanitizeColor(t.btnColor, DEFAULT_ACCENT);
	const fontFamily = sanitizeFont(t.fontFamily) ?? "Inter";
	const fontColor = sanitizeColor(t.fontColor, "");
	const avatarSize = t.avatarSize ?? "medium";
	const avatarShadowColor = sanitizeColor(t.avatarShadowColor, "");
	const wallpaperStyle = t.wallpaperStyle ?? (t.wallpaper === false ? "none" : "waves");
	const headerLayout = VALID_HEADER_LAYOUTS.has(t.headerLayout ?? "") ? t.headerLayout! : "center";

	const legacyBtnStyle = t.btnStyle ?? "rounded";
	const btnFill = t.btnFill ?? (legacyBtnStyle === "outline" ? "outline" : "solid");
	const btnRadius = t.btnRadius ?? (() => {
		if (legacyBtnStyle === "pill") return "full";
		if (legacyBtnStyle === "square") return "square";
		return "round";
	})();
	const btnTextColor = sanitizeColor(t.btnTextColor, "");

	const avatarSizes: Record<string, string> = { small: "64px", medium: "96px", large: "130px" };
	const avatarPx = avatarSizes[avatarSize] ?? "96px";

	let linkBorderRadius = "12px";
	if (btnRadius === "square") linkBorderRadius = "0";
	else if (btnRadius === "round") linkBorderRadius = "12px";
	else if (btnRadius === "rounder") linkBorderRadius = "20px";
	else if (btnRadius === "full") linkBorderRadius = "50px";

	let linkStyle = `border-radius:${linkBorderRadius};`;
	if (btnFill === "outline") {
		linkStyle += `border:1px solid ${effectiveBtnColor}40;background:transparent;color:${btnTextColor || "inherit"}`;
	} else if (btnFill === "glass") {
		linkStyle += `border:1px solid ${effectiveBtnColor}30;background:${effectiveBtnColor}18;backdrop-filter:blur(8px);color:${btnTextColor || "inherit"}`;
	} else {
		linkStyle += `border:1px solid ${effectiveBtnColor};background:${effectiveBtnColor};color:${btnTextColor || "#ffffff"}`;
	}

	const cssVars: Record<string, string> = {
		"--lt-accent": socialLinksColor,
		"--lt-accent-hover": socialLinksColor,
		"--lt-btn-accent": effectiveBtnColor,
	};

	if (fontFamily) cssVars["--lt-font"] = `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
	if (fontColor) {
		cssVars["--lt-text"] = fontColor;
		cssVars["--lt-dim"] = fontColor;
	}
	if (bgColor) cssVars["--lt-bg"] = bgColor;

	if (bgStyle === "dark") {
		cssVars["--lt-bg"] = bgColor || "#0a0a0a";
		cssVars["--lt-card"] = "#1a1a1a";
		if (!fontColor) cssVars["--lt-text"] = "#e5e5e5";
		cssVars["--lt-dim"] = fontColor || "#a3a3a3";
		cssVars["--lt-border"] = "#2a2a2a";
	}

	return {
		accentColor,
		bgStyle,
		bgColor,
		effectiveBtnColor,
		fontFamily,
		fontColor,
		avatarPx,
		avatarSize,
		avatarShadowColor: avatarShadowColor || accentColor,
		linkStyle,
		wallpaperStyle,
		headerLayout,
		btnFill,
		btnRadius,
		btnTextColor,
		socialLinksColor,
		cssVars,
	};
};
