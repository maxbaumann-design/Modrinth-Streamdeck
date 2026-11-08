import streamDeck, {
	SingletonAction,
	type Action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type WillAppearEvent,
	type WillDisappearEvent
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { poller, type PollSnapshot } from "../bridge";

/**
 * Base class for all actions: keeps every visible key subscribed to the shared state poller,
 * tracks the per-key settings and re-renders the key image whenever the game state or the
 * settings change.
 */
export abstract class BridgeAction<T extends JsonObject = JsonObject> extends SingletonAction<T> {
	readonly #settings = new Map<string, T>();
	readonly #lastImage = new Map<string, string>();

	override onWillAppear(ev: WillAppearEvent<T>): void {
		this.#settings.set(ev.action.id, ev.payload.settings);
		poller.subscribe(ev.action.id, (snapshot) => void this.#safeRender(ev.action, snapshot));
	}

	override onWillDisappear(ev: WillDisappearEvent<T>): void {
		poller.unsubscribe(ev.action.id);
		this.#settings.delete(ev.action.id);
		this.#lastImage.delete(ev.action.id);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<T>): void {
		this.#settings.set(ev.action.id, ev.payload.settings);
		void this.#safeRender(ev.action, poller.snapshot);
	}

	/** Draws the key for the given settings and game state. */
	protected abstract render(action: Action<T>, settings: T, snapshot: PollSnapshot): Promise<void> | void;

	/** Re-renders a single key with the latest known state (e.g. after a local UI change). */
	protected rerender(action: Action<T>): void {
		void this.#safeRender(action, poller.snapshot);
	}

	/** Sets the key image only when it differs from the last one sent, to keep traffic to Stream Deck low. */
	protected async setImageIfChanged(action: Action<T>, image: string): Promise<void> {
		if (this.#lastImage.get(action.id) === image) {
			return;
		}
		this.#lastImage.set(action.id, image);
		if (action.isKey() || action.isDial()) {
			await action.setImage(image);
		}
	}

	/**
	 * Runs a bridge call triggered by a key press: shows the OK checkmark on success, the warning
	 * triangle on failure, and asks the poller for a fresh state right away.
	 */
	protected async execute(ev: KeyDownEvent<T>, fn: () => Promise<unknown>, showOk = true): Promise<void> {
		try {
			await fn();
			if (showOk) {
				await ev.action.showOk();
			}
			poller.refreshSoon();
		} catch (err) {
			streamDeck.logger.warn(`${this.manifestId}: ${err instanceof Error ? err.message : String(err)}`);
			await ev.action.showAlert();
		}
	}

	async #safeRender(action: Action<T>, snapshot: PollSnapshot): Promise<void> {
		try {
			await this.render(action, this.#settings.get(action.id) ?? ({} as T), snapshot);
		} catch (err) {
			streamDeck.logger.error(`${this.manifestId}: failed to render key`, err);
		}
	}
}

/** Shortens text for key labels. */
export function truncate(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}
