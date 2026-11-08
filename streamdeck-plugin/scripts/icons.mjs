/**
 * Icon definitions shared by the build-time generator (scripts/generate-icons.mjs) and the runtime key renderer
 * (src/ui/icons.generated.ts). Every icon is SVG markup for a 24×24 viewBox drawn with white 2px strokes.
 */
export const ICONS = {
	// Actions
	gamemode: '<rect x="2" y="7" width="20" height="11" rx="4"/><line x1="7" y1="10.5" x2="7" y2="14.5"/><line x1="5" y1="12.5" x2="9" y2="12.5"/><circle cx="16" cy="11.5" r="1" fill="#fff"/><circle cx="18.5" cy="13.5" r="1" fill="#fff"/>',
	disconnect: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><polyline points="15 8 19 12 15 16"/><line x1="19" y1="12" x2="9" y2="12"/>',
	connect: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><polyline points="9 8 13 12 9 16"/><line x1="13" y1="12" x2="3" y2="12"/>',
	command: '<polyline points="4 6 9 11 4 16"/><line x1="11" y1="18" x2="20" y2="18"/>',
	perspective: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
	fullscreen: '<polyline points="4 9 4 4 9 4"/><polyline points="15 4 20 4 20 9"/><polyline points="20 15 20 20 15 20"/><polyline points="9 20 4 20 4 15"/>',
	screenshot: '<path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
	hud: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="8" y1="16" x2="8" y2="20"/><line x1="16" y1="16" x2="16" y2="20"/>',
	debug: '<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M8 12H4M20 12h-4M8 16H5M19 16h-3M9 8L7 5M15 8l2-3"/><line x1="12" y1="10" x2="12" y2="19"/>',
	pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
	volume: '<polygon points="4 9 8 9 13 5 13 19 8 15 4 15"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M19 7a7 7 0 0 1 0 10"/>',
	hotbar: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>',
	ping: '<rect x="2" y="14" width="3" height="6" rx="0.5"/><rect x="7.5" y="10" width="3" height="10" rx="0.5"/><rect x="13" y="6" width="3" height="14" rx="0.5"/><rect x="18.5" y="2" width="3" height="18" rx="0.5"/>',
	fps: '<path d="M4 16a8 8 0 1 1 16 0"/><line x1="12" y1="16" x2="16.5" y2="10.5"/><circle cx="12" cy="16" r="1.5" fill="#fff"/>',
	coordinates: '<circle cx="12" cy="12" r="6"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',
	status: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="1" fill="#fff"/><circle cx="7" cy="17" r="1" fill="#fff"/>',
	// Runtime-only variants
	play: '<polygon points="7 4 19 12 7 20"/>',
	"volume-muted": '<polygon points="4 9 8 9 13 5 13 19 8 15 4 15"/><line x1="17" y1="9.5" x2="22" y2="14.5"/><line x1="22" y1="9.5" x2="17" y2="14.5"/>',
	"fullscreen-exit": '<polyline points="9 4 9 9 4 9"/><polyline points="15 4 15 9 20 9"/><polyline points="20 15 15 15 15 20"/><polyline points="4 15 9 15 9 20"/>',
	"hud-hidden": '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="8" y1="16" x2="8" y2="20"/><line x1="16" y1="16" x2="16" y2="20"/><line x1="4" y1="3" x2="21" y2="21"/>',
	survival: '<line x1="19" y1="5" x2="9.5" y2="14.5"/><line x1="7" y1="13" x2="11" y2="17"/><line x1="9" y1="15" x2="5" y2="19"/>',
	creative: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5"/><line x1="12" y1="12" x2="12" y2="21"/>',
	adventure: '<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5" fill="#fff"/>',
	spectator: '<path d="M5 21v-9a7 7 0 0 1 14 0v9l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z"/><circle cx="9.5" cy="11" r="1" fill="#fff"/><circle cx="14.5" cy="11" r="1" fill="#fff"/>',
	"first-person": '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
	"third-person-back": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
	"third-person-front": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><circle cx="10.5" cy="7.5" r="0.8" fill="#fff"/><circle cx="13.5" cy="7.5" r="0.8" fill="#fff"/>',
	warning: '<path d="M12 3L2 21h20z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17.5" r="0.9" fill="#fff"/>',
	check: '<polyline points="4 12 10 18 20 6"/>',
	plug: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>'
};

export const STROKE_ATTRS = 'fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** Wraps icon markup in a standalone 24×24 SVG scaled to the given size. */
export function iconSvg(name, size, color = "#fff") {
	const markup = ICONS[name];
	if (!markup) throw new Error(`Unknown icon: ${name}`);
	const body = color === "#fff" ? markup : markup.replaceAll("#fff", color);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ${STROKE_ATTRS.replace("#fff", color)}>${body}</svg>`;
}
