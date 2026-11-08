import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { bridge, poller, type PollSnapshot } from "../bridge";
import { COLORS, formatCoordinate, fpsColor, pingColor, prettyDimension, tile } from "../ui/images";
import { BridgeAction, truncate } from "./base";

@action({ UUID: "com.maxbaumann.streamdeckbridge.ping" })
export class PingAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		if (state === null) {
			return this.setImageIfChanged(action, tile({ icon: "ping", label: "Minecraft offline", offline: true }));
		}
		if (!state.inGame || state.ping === null) {
			const label = state.inGame && state.connection === "singleplayer" ? "Singleplayer" : "No server";
			return this.setImageIfChanged(action, tile({ icon: "ping", value: "—", label, valueColor: COLORS.muted }));
		}
		const color = pingColor(state.ping);
		return this.setImageIfChanged(action, tile({ icon: "ping", value: `${state.ping}`, label: "ms", valueColor: color, accent: color }));
	}

	override onKeyDown(_ev: KeyDownEvent): void {
		poller.refreshSoon(0);
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.fps" })
export class FpsAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		if (state === null) {
			return this.setImageIfChanged(action, tile({ icon: "fps", label: "Minecraft offline", offline: true }));
		}
		const color = fpsColor(state.fps);
		return this.setImageIfChanged(action, tile({ icon: "fps", value: `${state.fps}`, label: "FPS", valueColor: color, accent: color }));
	}

	override onKeyDown(_ev: KeyDownEvent): void {
		poller.refreshSoon(0);
	}
}

type CoordinatesSettings = {
	/** Send the position to chat when the key is pressed. */
	shareOnPress?: boolean;
	/** Chat template; placeholders: {x} {y} {z} {dimension} {biome}. */
	template?: string;
};

const DEFAULT_TEMPLATE = "I'm at X {x} Y {y} Z {z} ({dimension})";

@action({ UUID: "com.maxbaumann.streamdeckbridge.coordinates" })
export class CoordinatesAction extends BridgeAction<CoordinatesSettings> {
	protected override render(action: Action<CoordinatesSettings>, _settings: CoordinatesSettings, { state }: PollSnapshot): Promise<void> {
		if (state === null) {
			return this.setImageIfChanged(action, tile({ icon: "coordinates", label: "Minecraft offline", offline: true }));
		}
		const player = state.player;
		if (!state.inGame || player === null) {
			return this.setImageIfChanged(action, tile({ icon: "coordinates", label: "Not in game" }));
		}
		return this.setImageIfChanged(
			action,
			tile({
				lines: [`X ${formatCoordinate(player.x)}`, `Y ${formatCoordinate(player.y)}`, `Z ${formatCoordinate(player.z)}`],
				label: prettyDimension(player.dimension)
			})
		);
	}

	override async onKeyDown(ev: KeyDownEvent<CoordinatesSettings>): Promise<void> {
		const player = poller.snapshot.state?.player;
		if (!ev.payload.settings.shareOnPress || !player) {
			poller.refreshSoon(0);
			return;
		}
		const template = ev.payload.settings.template?.trim() || DEFAULT_TEMPLATE;
		const message = template
			.replaceAll("{x}", formatCoordinate(player.x))
			.replaceAll("{y}", formatCoordinate(player.y))
			.replaceAll("{z}", formatCoordinate(player.z))
			.replaceAll("{dimension}", prettyDimension(player.dimension))
			.replaceAll("{biome}", player.biome ? prettyDimension(player.biome) : "unknown biome");
		await this.execute(ev, () => bridge.runAction("chat", { message }));
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.status" })
export class StatusAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		if (state === null) {
			return this.setImageIfChanged(action, tile({ icon: "status", label: "Minecraft offline", offline: true }));
		}
		if (!state.inGame) {
			return this.setImageIfChanged(action, tile({ icon: "status", label: state.screen ? "In menu" : "Loading", accent: COLORS.muted }));
		}
		if (state.connection === "singleplayer" || state.server === null) {
			return this.setImageIfChanged(action, tile({ icon: "status", label: "Singleplayer", accent: COLORS.info }));
		}
		const server = state.server;
		const players = server.players === null ? "" : server.maxPlayers === null ? `${server.players} online` : `${server.players}/${server.maxPlayers}`;
		const name = server.name && server.name !== server.address ? server.name : server.address;
		return this.setImageIfChanged(
			action,
			tile({
				lines: players ? [truncate(name, 14), players] : [truncate(name, 14)],
				label: truncate(server.address, 20),
				accent: state.connection === "realms" ? COLORS.info : COLORS.accent
			})
		);
	}

	override onKeyDown(_ev: KeyDownEvent): void {
		poller.refreshSoon(0);
	}
}
