import { ICONS, STROKE_ATTRS } from "./icons.generated";

/** Colours shared by all generated key images. */
export const COLORS = {
	background: "#1b1f24",
	backgroundActive: "#1f3a2a",
	backgroundOffline: "#2a2326",
	text: "#f3f4f6",
	muted: "#8b949e",
	accent: "#3fb950",
	warn: "#d29922",
	bad: "#f85149",
	info: "#58a6ff"
} as const;

export interface TileOptions {
	/** Name of an icon from {@link ICONS}; omitted for value-only tiles. */
	icon?: string;
	/** Large text in the centre (e.g. the ping). */
	value?: string;
	/** Small caption under the value / icon. */
	label?: string;
	/** Colour of the value text (defaults to white). */
	valueColor?: string;
	/** Colour of a thin indicator bar at the top of the key; omitted for none. */
	accent?: string;
	/** Highlights the whole tile (used when the key's option is the active one). */
	active?: boolean;
	/** Dims the tile and swaps the icon for a warning, used while Minecraft is not reachable. */
	offline?: boolean;
	/** Secondary small line above the label (e.g. dimension). */
	sublabel?: string;
	/** Up to three stacked text lines instead of an icon/value (used for coordinates and server status). */
	lines?: string[];
}

const FONT = "font-family=\"-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif\"";

function escapeXml(text: string): string {
	return text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

/** Picks a font size so that `text` fits the 144px wide key. */
function fitFontSize(text: string, max: number, min = 22): number {
	const budget = 118; // usable width in px
	const perChar = 0.58; // average glyph width relative to font size for this font stack
	const size = Math.floor(budget / Math.max(1, text.length) / perChar);
	return Math.max(min, Math.min(max, size));
}

/**
 * Renders a 144×144 key image as an SVG data URI understood by Stream Deck's `setImage`.
 */
export function tile(options: TileOptions): string {
	const { icon, value, label, sublabel, accent, active, offline, lines } = options;
	const bg = offline ? COLORS.backgroundOffline : active ? COLORS.backgroundActive : COLORS.background;
	const stroke = offline ? COLORS.muted : COLORS.text;
	const iconName = offline ? "warning" : icon;
	const parts: string[] = [`<rect width="144" height="144" rx="18" fill="${bg}"/>`];

	if (active) {
		parts.push(`<rect x="2" y="2" width="140" height="140" rx="16" fill="none" stroke="${COLORS.accent}" stroke-width="4"/>`);
	}
	if (accent && !offline) {
		parts.push(`<rect x="28" y="10" width="88" height="6" rx="3" fill="${accent}"/>`);
	}

	const hasValue = value !== undefined && value.length > 0;
	const hasLabel = label !== undefined && label.length > 0;
	const hasSub = sublabel !== undefined && sublabel.length > 0;

	if (iconName && ICONS[iconName] && !(lines && lines.length > 0 && !offline)) {
		// Icon only: big and centred. Icon with text: smaller and pushed up.
		const scale = hasValue || hasLabel ? 2.4 : 3.4;
		const size = 24 * scale;
		const x = (144 - size) / 2;
		const y = hasValue ? 14 : hasLabel ? 24 : (144 - size) / 2;
		const attrs = STROKE_ATTRS.replace("#fff", stroke);
		const markup = ICONS[iconName].replaceAll("#fff", stroke);
		parts.push(`<g transform="translate(${x} ${y}) scale(${scale})" ${attrs}>${markup}</g>`);
	}

	if (lines && lines.length > 0 && !offline) {
		const shown = lines.slice(0, 3);
		const lineHeight = 30;
		const blockHeight = shown.length * lineHeight;
		const top = (hasLabel ? 112 : 144) / 2 - blockHeight / 2 + lineHeight / 2;
		shown.forEach((line, i) => {
			const fontSize = fitFontSize(line, 26, 14);
			parts.push(
				`<text x="72" y="${top + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" fill="${COLORS.text}" font-size="${fontSize}" font-weight="600" ${FONT}>${escapeXml(line)}</text>`
			);
		});
	}

	if (hasValue) {
		const color = offline ? COLORS.muted : (options.valueColor ?? COLORS.text);
		const fontSize = fitFontSize(value, iconName ? 40 : 52);
		const y = iconName ? 104 : hasLabel ? 84 : 86;
		parts.push(
			`<text x="72" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="${fontSize}" font-weight="600" ${FONT}>${escapeXml(value)}</text>`
		);
	}

	if (hasSub) {
		parts.push(`<text x="72" y="108" text-anchor="middle" fill="${COLORS.muted}" font-size="15" ${FONT}>${escapeXml(sublabel)}</text>`);
	}

	if (hasLabel) {
		const fontSize = fitFontSize(label, 18, 12);
		parts.push(`<text x="72" y="130" text-anchor="middle" fill="${COLORS.muted}" font-size="${fontSize}" ${FONT}>${escapeXml(label)}</text>`);
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">${parts.join("")}</svg>`;
	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/** Colour for a latency value: green under 80 ms, amber under 160 ms, red above. */
export function pingColor(ping: number): string {
	if (ping < 80) return COLORS.accent;
	if (ping < 160) return COLORS.warn;
	return COLORS.bad;
}

/** Colour for a frame rate: green from 60 fps, amber from 30 fps, red below. */
export function fpsColor(fps: number): string {
	if (fps >= 60) return COLORS.accent;
	if (fps >= 30) return COLORS.warn;
	return COLORS.bad;
}

/** Formats a block coordinate without decimals and with a minus sign that survives small fonts. */
export function formatCoordinate(value: number): string {
	return Math.floor(value).toString();
}

/** Shortens `minecraft:the_nether` to `Nether`, keeps custom dimensions readable. */
export function prettyDimension(id: string): string {
	switch (id) {
		case "minecraft:overworld":
			return "Overworld";
		case "minecraft:the_nether":
			return "Nether";
		case "minecraft:the_end":
			return "End";
		default: {
			const path = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
			return path.replace(/^the_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
		}
	}
}
