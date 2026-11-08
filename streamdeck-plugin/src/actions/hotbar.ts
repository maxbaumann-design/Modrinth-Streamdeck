import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import { bridge, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction } from "./base";

type HotbarSettings = {
	/** Hotbar slot 1–9. */
	slot?: string | number;
};

function slotOf(settings: HotbarSettings): number {
	const n = typeof settings.slot === "number" ? settings.slot : parseInt(String(settings.slot ?? ""), 10);
	return Number.isFinite(n) ? Math.min(9, Math.max(1, n)) : 1;
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.hotbar" })
export class HotbarAction extends BridgeAction<HotbarSettings> {
	protected override render(action: Action<HotbarSettings>, settings: HotbarSettings, { state }: PollSnapshot): Promise<void> {
		const slot = slotOf(settings);
		const active = state?.inGame === true && state.player?.selectedSlot === slot - 1;
		return this.setImageIfChanged(action, tile({ icon: "hotbar", value: `${slot}`, label: "Hotbar slot", active, offline: state === null }));
	}

	override onKeyDown(ev: KeyDownEvent<HotbarSettings>): Promise<void> {
		return this.execute(ev, () => bridge.runAction("hotbar", { slot: slotOf(ev.payload.settings) }), false);
	}
}
