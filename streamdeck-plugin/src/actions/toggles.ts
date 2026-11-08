import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { bridge, type PerspectiveName, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction } from "./base";

type PerspectiveSettings = {
	mode?: "cycle" | PerspectiveName;
};

const PERSPECTIVE_ICON: Record<PerspectiveName, string> = {
	first_person: "first-person",
	third_person_back: "third-person-back",
	third_person_front: "third-person-front"
};

const PERSPECTIVE_LABEL: Record<PerspectiveName, string> = {
	first_person: "1st person",
	third_person_back: "3rd person",
	third_person_front: "Front view"
};

@action({ UUID: "com.maxbaumann.streamdeckbridge.perspective" })
export class PerspectiveAction extends BridgeAction<PerspectiveSettings> {
	protected override render(action: Action<PerspectiveSettings>, settings: PerspectiveSettings, { state }: PollSnapshot): Promise<void> {
		const mode = settings.mode ?? "cycle";
		const current = state?.perspective ?? "first_person";
		const shown = mode === "cycle" ? current : mode;
		return this.setImageIfChanged(
			action,
			tile({
				icon: PERSPECTIVE_ICON[shown],
				label: PERSPECTIVE_LABEL[shown],
				active: mode !== "cycle" && state !== null && current === mode,
				offline: state === null
			})
		);
	}

	override onKeyDown(ev: KeyDownEvent<PerspectiveSettings>): Promise<void> {
		return this.execute(ev, () => bridge.runAction("perspective", { mode: ev.payload.settings.mode ?? "cycle" }), false);
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.fullscreen" })
export class FullscreenAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		const fullscreen = state?.fullscreen === true;
		return this.setImageIfChanged(
			action,
			tile({
				icon: fullscreen ? "fullscreen-exit" : "fullscreen",
				label: fullscreen ? "Fullscreen" : "Windowed",
				active: fullscreen,
				offline: state === null
			})
		);
	}

	override onKeyDown(ev: KeyDownEvent): Promise<void> {
		return this.execute(ev, () => bridge.runAction("fullscreen", { mode: "toggle" }), false);
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.screenshot" })
export class ScreenshotAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		return this.setImageIfChanged(action, tile({ icon: "screenshot", label: state?.inGame ? "Screenshot" : "Not in game", offline: state === null }));
	}

	override onKeyDown(ev: KeyDownEvent): Promise<void> {
		return this.execute(ev, () => bridge.runAction("screenshot"));
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.hud" })
export class HudAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		const hidden = state?.hudHidden === true;
		return this.setImageIfChanged(
			action,
			tile({ icon: hidden ? "hud-hidden" : "hud", label: hidden ? "HUD hidden" : "HUD shown", active: hidden, offline: state === null })
		);
	}

	override onKeyDown(ev: KeyDownEvent): Promise<void> {
		return this.execute(ev, () => bridge.runAction("hud", { mode: "toggle" }), false);
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.debug" })
export class DebugAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		const visible = state?.debugHud === true;
		return this.setImageIfChanged(action, tile({ icon: "debug", label: visible ? "F3 on" : "F3 off", active: visible, offline: state === null }));
	}

	override onKeyDown(ev: KeyDownEvent): Promise<void> {
		return this.execute(ev, () => bridge.runAction("debug", { mode: "toggle" }), false);
	}
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.pause" })
export class PauseAction extends BridgeAction {
	protected override render(action: Action<JsonObject>, _settings: unknown, { state }: PollSnapshot): Promise<void> {
		const paused = state?.paused === true;
		return this.setImageIfChanged(
			action,
			tile({
				icon: paused ? "play" : "pause",
				label: !state?.inGame ? "Not in game" : paused ? "Resume" : "Pause",
				active: paused,
				offline: state === null
			})
		);
	}

	override onKeyDown(ev: KeyDownEvent): Promise<void> {
		return this.execute(ev, () => bridge.runAction("pause", { mode: "toggle" }), false);
	}
}
