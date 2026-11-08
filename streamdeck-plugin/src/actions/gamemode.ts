import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import { bridge, type GameModeName, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction } from "./base";

type GamemodeSettings = {
	/** Target mode, or `cycle` to step through all four modes like F3+F4, or `toggle` for survival ⇄ creative. */
	mode?: GameModeName | "cycle" | "toggle";
};

const LABELS: Record<GameModeName, string> = {
	survival: "Survival",
	creative: "Creative",
	adventure: "Adventure",
	spectator: "Spectator"
};

@action({ UUID: "com.maxbaumann.streamdeckbridge.gamemode" })
export class GamemodeAction extends BridgeAction<GamemodeSettings> {
	protected override render(action: Action<GamemodeSettings>, settings: GamemodeSettings, { state }: PollSnapshot): Promise<void> {
		const mode = settings.mode ?? "cycle";
		const current = state?.player?.gamemode ?? null;
		const offline = state === null;

		if (mode === "cycle" || mode === "toggle") {
			return this.setImageIfChanged(
				action,
				tile({
					icon: current ?? "gamemode",
					label: current ? LABELS[current] : state?.inGame ? "Game mode" : "Not in game",
					offline
				})
			);
		}

		return this.setImageIfChanged(
			action,
			tile({
				icon: mode,
				label: LABELS[mode],
				active: !offline && state?.inGame === true && current === mode,
				offline
			})
		);
	}

	override onKeyDown(ev: KeyDownEvent<GamemodeSettings>): Promise<void> {
		return this.execute(ev, () => bridge.runAction("gamemode", { mode: ev.payload.settings.mode ?? "cycle" }));
	}
}
