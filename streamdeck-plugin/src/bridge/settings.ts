import streamDeck from "@elgato/streamdeck";

/**
 * Global (plugin-wide) settings, edited through the "Connection" section of every property inspector.
 * Values arrive as strings from the property inspector, so everything is normalised in {@link resolveGlobalSettings}.
 */
export type GlobalSettings = {
	host?: string;
	port?: string | number;
	token?: string;
	pollIntervalMs?: string | number;
};

export interface ResolvedGlobalSettings {
	host: string;
	port: number;
	token: string;
	pollIntervalMs: number;
}

export const DEFAULT_SETTINGS: ResolvedGlobalSettings = {
	host: "127.0.0.1",
	port: 25580,
	token: "",
	pollIntervalMs: 1000
};

function toInt(value: string | number | undefined, fallback: number, min: number, max: number): number {
	const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function resolveGlobalSettings(raw: GlobalSettings | undefined): ResolvedGlobalSettings {
	const host = (raw?.host ?? "").trim();
	return {
		host: host.length > 0 ? host : DEFAULT_SETTINGS.host,
		port: toInt(raw?.port, DEFAULT_SETTINGS.port, 1, 65535),
		token: (raw?.token ?? "").trim(),
		pollIntervalMs: toInt(raw?.pollIntervalMs, DEFAULT_SETTINGS.pollIntervalMs, 250, 10000)
	};
}

/**
 * Keeps an always-current copy of the global settings and notifies listeners when they change.
 */
export class GlobalSettingsStore {
	#current: ResolvedGlobalSettings = DEFAULT_SETTINGS;
	readonly #listeners = new Set<(settings: ResolvedGlobalSettings) => void>();

	get current(): ResolvedGlobalSettings {
		return this.#current;
	}

	/** Loads the persisted settings and starts listening for changes made in the property inspector. */
	async initialize(): Promise<void> {
		streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => this.#update(ev.settings));
		try {
			this.#update(await streamDeck.settings.getGlobalSettings<GlobalSettings>());
		} catch (err) {
			streamDeck.logger.warn("Could not load global settings, using defaults", err);
		}
	}

	onChange(listener: (settings: ResolvedGlobalSettings) => void): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	#update(raw: GlobalSettings | undefined): void {
		const next = resolveGlobalSettings(raw);
		const changed = JSON.stringify(next) !== JSON.stringify(this.#current);
		this.#current = next;
		if (changed) {
			streamDeck.logger.info(`Bridge connection settings: http://${next.host}:${next.port} (poll every ${next.pollIntervalMs} ms)`);
			for (const listener of this.#listeners) {
				listener(next);
			}
		}
	}
}

export const globalSettings = new GlobalSettingsStore();
