import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import { bridge, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction } from "./base";

type DisconnectSettings = {
	/** Require a second press within a short window before actually disconnecting. */
	confirm?: boolean;
};

const CONFIRM_WINDOW_MS = 2500;

@action({ UUID: "com.maxbaumann.streamdeckbridge.disconnect" })
export class DisconnectAction extends BridgeAction<DisconnectSettings> {
	readonly #pending = new Map<string, number>();

	protected override render(action: Action<DisconnectSettings>, _settings: DisconnectSettings, { state }: PollSnapshot): Promise<void> {
		const offline = state === null;
		const armed = this.#isArmed(action.id);
		let label = "Not connected";
		if (state?.inGame) {
			label = armed ? "Press again" : state.connection === "singleplayer" ? "Leave world" : "Disconnect";
		}
		return this.setImageIfChanged(action, tile({ icon: "disconnect", label, offline, accent: armed ? "#f85149" : undefined }));
	}

	override async onKeyDown(ev: KeyDownEvent<DisconnectSettings>): Promise<void> {
		if (ev.payload.settings.confirm && !this.#isArmed(ev.action.id)) {
			this.#pending.set(ev.action.id, Date.now());
			this.rerender(ev.action);
			setTimeout(() => {
				if (!this.#isArmed(ev.action.id)) {
					this.#pending.delete(ev.action.id);
					this.rerender(ev.action);
				}
			}, CONFIRM_WINDOW_MS + 50);
			return;
		}
		this.#pending.delete(ev.action.id);
		await this.execute(ev, () => bridge.runAction("disconnect"));
	}

	#isArmed(id: string): boolean {
		const at = this.#pending.get(id);
		return at !== undefined && Date.now() - at <= CONFIRM_WINDOW_MS;
	}
}
