export const generateWallpaperSvg = (style: string, color: string): string => {
	const cls = "lt-wallpaper";
	const svgOpen = `<svg class="${cls}" viewBox="0 0 480 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">`;
	const svgClose = "</svg>";

	switch (style) {
		case "waves":
			return `${svgOpen}
				<path d="M-50 200 C50 150, 150 350, 250 200 S450 100, 530 250" stroke="${color}" stroke-opacity="0.12" stroke-width="2" fill="none"/>
				<path d="M-50 400 C100 350, 200 500, 350 380 S500 450, 530 350" stroke="${color}" stroke-opacity="0.08" stroke-width="1.5" fill="none"/>
				<path d="M-50 600 C80 550, 180 700, 300 580 S480 650, 530 550" stroke="${color}" stroke-opacity="0.10" stroke-width="1.5" fill="none"/>
				<path d="M530 100 C400 150, 350 50, 200 120 S50 80, -50 150" stroke="${color}" stroke-opacity="0.06" stroke-width="1" fill="none"/>
				<path d="M530 700 C380 680, 280 800, 150 720 S20 780, -50 700" stroke="${color}" stroke-opacity="0.08" stroke-width="1.5" fill="none"/>
			${svgClose}`;
		case "grid": {
			let lines = "";
			for (let x = 40; x < 480; x += 40) lines += `<line x1="${x}" y1="0" x2="${x}" y2="900" stroke="${color}" stroke-opacity="0.06" stroke-width="1"/>`;
			for (let y = 40; y < 900; y += 40) lines += `<line x1="0" y1="${y}" x2="480" y2="${y}" stroke="${color}" stroke-opacity="0.06" stroke-width="1"/>`;
			return `${svgOpen}${lines}${svgClose}`;
		}
		case "dots": {
			let dots = "";
			for (let y = 20; y < 900; y += 30) {
				for (let x = 20; x < 480; x += 30) {
					dots += `<circle cx="${x}" cy="${y}" r="1.5" fill="${color}" opacity="0.10"/>`;
				}
			}
			return `${svgOpen}${dots}${svgClose}`;
		}
		case "morph":
			return `${svgOpen}
				<circle cx="120" cy="200" r="100" stroke="${color}" stroke-opacity="0.08" stroke-width="1.5" fill="none"/>
				<circle cx="360" cy="150" r="60" stroke="${color}" stroke-opacity="0.06" stroke-width="1" fill="none"/>
				<ellipse cx="240" cy="500" rx="160" ry="80" stroke="${color}" stroke-opacity="0.07" stroke-width="1.5" fill="none"/>
				<circle cx="80" cy="700" r="70" stroke="${color}" stroke-opacity="0.05" stroke-width="1" fill="none"/>
				<circle cx="400" cy="650" r="90" stroke="${color}" stroke-opacity="0.06" stroke-width="1.5" fill="none"/>
			${svgClose}`;
		default:
			return "";
	}
};
