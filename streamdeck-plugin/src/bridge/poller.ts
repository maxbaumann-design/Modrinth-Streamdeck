import streamDeck from "@elgato/streamdeck";
import type { BridgeClient } from "./client";
import { BridgeError } from "./client";
import type { GameState } from "./types";

export interface PollSnapshot {
	/** Latest state, or null when the mod is unreachable. */
	state: GameState | null;
	/** Set when the last poll failed. */
	error: BridgeError | null;
}

export type PollListener = (snapshot: PollSnapshot) => void;

/**
 * Polls the mod for its state at a fixed interval while at least one action is listening,
 * and fans the result out to every subscriber. One HTTP request serves all visible keys.
 */
export class StatePoller {
	#timer: ReturnType<typeof setTimeout> | undefined;
	#inFlight = false;
	#snapshot: PollSnapshot = { state: null, error: null };
	readonly #listeners = new Map<string, PollListener>();

	constructor(
		private readonly client: BridgeClient,
		private readonly getInterval: () => number
	) {}

	get snapshot(): PollSnapshot {
		return this.#snapshot;
	}

	/**
	 * Registers a listener (keyed by action id). The listener receives the latest snapshot immediately
	 * and after every poll until {@link unsubscribe} is called.
	 */
	subscribe(id: string, listener: PollListener): void {
		this.#listeners.set(id, listener);
		listener(this.#snapshot);
		if (this.#timer === undefined && !this.#inFlight) {
			void this.#poll();
		}
	}

	unsubscribe(id: string): void {
		this.#listeners.delete(id);
		if (this.#listeners.size === 0) {
			this.#stop();
		}
	}

	/** Forces an immediate refresh, e.g. right after an action was executed. */
	refreshSoon(delayMs = 150): void {
		if (this.#listeners.size === 0) {
			return;
		}
		this.#stop();
		this.#timer = setTimeout(() => void this.#poll(), delayMs);
	}

	/** Restarts the polling loop, used when the connection settings change. */
	restart(): void {
		this.#snapshot = { state: null, error: null };
		this.refreshSoon(0);
	}

	#stop(): void {
		if (this.#timer !== undefined) {
			clearTimeout(this.#timer);
			this.#timer = undefined;
		}
	}

	async #poll(): Promise<void> {
		this.#timer = undefined;
		if (this.#listeners.size === 0) {
			return;
		}
		this.#inFlight = true;
		try {
			const state = await this.client.getState();
			this.#publish({ state, error: null });
		} catch (err) {
			const error = err instanceof BridgeError ? err : new BridgeError(String(err), true);
			if (this.#snapshot.error === null) {
				streamDeck.logger.debug(`Polling failed: ${error.message}`);
			}
			this.#publish({ state: null, error });
		} finally {
			this.#inFlight = false;
			if (this.#listeners.size > 0 && this.#timer === undefined) {
				// Back off a little while the game is not running to keep the plugin quiet.
				const interval = this.#snapshot.error?.unreachable ? Math.max(this.getInterval(), 2000) : this.getInterval();
				this.#timer = setTimeout(() => void this.#poll(), interval);
			}
		}
	}

	#publish(snapshot: PollSnapshot): void {
		this.#snapshot = snapshot;
		for (const listener of [...this.#listeners.values()]) {
			try {
				listener(snapshot);
			} catch (err) {
				streamDeck.logger.error("State listener failed", err);
			}
		}
	}
}
