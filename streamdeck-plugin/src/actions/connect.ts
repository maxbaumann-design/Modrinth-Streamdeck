import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import { bridge, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction, truncate } from "./base";

type ConnectSettings = {
	/** Server address, e.g. `play.example.com` or `192.168.0.10:25566`. */
	address?: string;
	/** Optional display name used for the key label and the server list entry. */
	name?: string;
};

function normalizeAddress(address: string): string {
	return address.trim().toLowerCase().replace(/:25565$/, "");
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.connect" })
export class ConnectAction extends BridgeAction<ConnectSettings> {
	protected override render(action: Action<ConnectSettings>, settings: ConnectSettings, { state }: PollSnapshot): Promise<void> {
		const address = settings.address?.trim() ?? "";
		const connected = address.length > 0 && state?.server !== null && state?.server !== undefined && normalizeAddress(state.server.address) === normalizeAddress(address);
		const label = settings.name?.trim() || (address.length > 0 ? truncate(address, 16) : "Set address");
		return this.setImageIfChanged(action, tile({ icon: "connect", label, active: connected, offline: state === null }));
	}

	override async onKeyDown(ev: KeyDownEvent<ConnectSettings>): Promise<void> {
		const address = ev.payload.settings.address?.trim() ?? "";
		if (address.length === 0) {
			await ev.action.showAlert();
			return;
		}
		await this.execute(ev, () => bridge.runAction("connect", { address, name: ev.payload.settings.name?.trim() ?? "" }), false);
	}
}
