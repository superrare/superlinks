const DEFAULT_ACCENT = "#111111";

interface ThemeConfig {
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
}

export const resolveThemeVars = (theme: ThemeConfig | null | undefined) => {
	const t = theme && typeof theme === "object" ? theme : {};

	const accentColor = t.accentColor ?? DEFAULT_ACCENT;
	const socialLinksColor = t.socialLinksColor ?? accentColor;
	const bgStyle = t.bgStyle ?? "solid";
	const bgColor = t.bgColor ?? "";
	const effectiveBtnColor = t.btnColor || DEFAULT_ACCENT;
	const fontFamily = t.fontFamily ?? "Inter";
	const fontColor = t.fontColor ?? "";
	const avatarSize = t.avatarSize ?? "medium";
	const avatarShadowColor = t.avatarShadowColor ?? "";
	const wallpaperStyle = t.wallpaperStyle ?? (t.wallpaper === false ? "none" : "waves");

	const legacyBtnStyle = t.btnStyle ?? "rounded";
	const btnFill = t.btnFill ?? (legacyBtnStyle === "outline" ? "outline" : "solid");
	const btnRadius = t.btnRadius ?? (() => {
		if (legacyBtnStyle === "pill") return "full";
		if (legacyBtnStyle === "square") return "square";
		return "round";
	})();
	const btnTextColor = t.btnTextColor ?? "";

	const avatarSizes: Record<string, string> = { small: "64px", medium: "96px", large: "130px" };
	const avatarPx = avatarSizes[avatarSize] ?? "96px";

	let linkBorderRadius = "12px";
	if (btnRadius === "square") linkBorderRadius = "0";
	else if (btnRadius === "round") linkBorderRadius = "12px";
	else if (btnRadius === "rounder") linkBorderRadius = "20px";
	else if (btnRadius === "full") linkBorderRadius = "50px";

	let linkStyle = `border-radius:${linkBorderRadius};`;
	if (btnFill === "outline") {
		linkStyle += `border:2px solid ${effectiveBtnColor};background:transparent;color:${btnTextColor || "inherit"}`;
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
		avatarPx,
		avatarShadowColor: avatarShadowColor || accentColor,
		linkStyle,
		wallpaperStyle,
		cssVars,
	};
};
