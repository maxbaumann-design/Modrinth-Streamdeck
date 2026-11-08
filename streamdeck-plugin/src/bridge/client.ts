import type { ResolvedGlobalSettings } from "./settings";
import type { ActionResult, GameState } from "./types";

/** Error raised when the mod's HTTP server could not be reached or answered with an error. */
export class BridgeError extends Error {
	constructor(
		message: string,
		readonly unreachable: boolean
	) {
		super(message);
		this.name = "BridgeError";
	}
}

/**
 * Thin HTTP client for the Stream Deck Bridge mod's local REST API.
 */
export class BridgeClient {
	constructor(private readonly getSettings: () => ResolvedGlobalSettings) {}

	get baseUrl(): string {
		const { host, port } = this.getSettings();
		const h = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
		return `http://${h}:${port}`;
	}

	/** Fetches the current game state snapshot. */
	async getState(timeoutMs = 1500): Promise<GameState> {
		return (await this.#request("GET", "/state", undefined, timeoutMs)) as GameState;
	}

	/** Executes a named action on the Minecraft client thread. */
	async runAction(name: string, body: Record<string, unknown> = {}, timeoutMs = 6000): Promise<ActionResult> {
		const result = (await this.#request("POST", `/action/${encodeURIComponent(name)}`, body, timeoutMs)) as ActionResult;
		if (!result.ok) {
			throw new BridgeError(result.error ?? `Action "${name}" failed`, false);
		}
		return result;
	}

	async #request(method: "GET" | "POST", path: string, body: unknown, timeoutMs: number): Promise<unknown> {
		const { token } = this.getSettings();
		const headers: Record<string, string> = { Accept: "application/json" };
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
		}

		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
				signal: AbortSignal.timeout(timeoutMs)
			});
		} catch (err) {
			throw new BridgeError(`Minecraft not reachable at ${this.baseUrl}: ${describe(err)}`, true);
		}

		const text = await response.text();
		let json: unknown = undefined;
		if (text.length > 0) {
			try {
				json = JSON.parse(text);
			} catch {
				throw new BridgeError(`Unexpected response from ${path}: ${text.slice(0, 120)}`, false);
			}
		}

		if (response.status === 401 || response.status === 403) {
			throw new BridgeError("Rejected by the mod: check the API token in the plugin's connection settings", false);
		}
		if (!response.ok) {
			const error = (json as ActionResult | undefined)?.error ?? `HTTP ${response.status}`;
			throw new BridgeError(error, false);
		}
		return json;
	}
}

function describe(err: unknown): string {
	if (err instanceof Error) {
		const cause = (err as Error & { cause?: { code?: string } }).cause;
		return cause?.code ?? err.name;
	}
	return String(err);
}
