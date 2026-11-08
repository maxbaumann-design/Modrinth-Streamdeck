import streamDeck from "@elgato/streamdeck";

import { globalSettings } from "./bridge";
import { CommandAction } from "./actions/command";
import { ConnectAction } from "./actions/connect";
import { DisconnectAction } from "./actions/disconnect";
import { CoordinatesAction, FpsAction, PingAction, StatusAction } from "./actions/displays";
import { GamemodeAction } from "./actions/gamemode";
import { HotbarAction } from "./actions/hotbar";
import { DebugAction, FullscreenAction, HudAction, PauseAction, PerspectiveAction, ScreenshotAction } from "./actions/toggles";
import { VolumeAction } from "./actions/volume";

streamDeck.logger.setLevel("info");

for (const action of [
	new GamemodeAction(),
	new DisconnectAction(),
	new ConnectAction(),
	new CommandAction(),
	new PerspectiveAction(),
	new FullscreenAction(),
	new ScreenshotAction(),
	new HudAction(),
	new DebugAction(),
	new PauseAction(),
	new VolumeAction(),
	new HotbarAction(),
	new PingAction(),
	new FpsAction(),
	new CoordinatesAction(),
	new StatusAction()
]) {
	streamDeck.actions.registerAction(action);
}

await streamDeck.connect();
await globalSettings.initialize();
