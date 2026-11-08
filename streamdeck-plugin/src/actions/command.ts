import { action, type Action, type KeyDownEvent } from "@elgato/streamdeck";
import { bridge, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction, truncate } from "./base";

type CommandSettings = {
	/** `command` runs the text as a server command (leading slash optional); `chat` sends it as a chat message. */
	kind?: "command" | "chat";
	/** The command or message, e.g. `time set day`. */
	command?: string;
	/** Optional label shown on the key instead of the command text. */
	label?: string;
};

@action({ UUID: "com.maxbaumann.streamdeckbridge.command" })
export class CommandAction extends BridgeAction<CommandSettings> {
	protected override render(action: Action<CommandSettings>, settings: CommandSettings, { state }: PollSnapshot): Promise<void> {
		const text = settings.command?.trim() ?? "";
		const label = settings.label?.trim() || (text.length > 0 ? truncate(text.replace(/^\//, ""), 16) : "Set command");
		return this.setImageIfChanged(action, tile({ icon: "command", label, offline: state === null }));
	}

	override async onKeyDown(ev: KeyDownEvent<CommandSettings>): Promise<void> {
		const text = ev.payload.settings.command?.trim() ?? "";
		if (text.length === 0) {
			await ev.action.showAlert();
			return;
		}
		const kind = ev.payload.settings.kind ?? "command";
		if (kind === "chat" && !text.startsWith("/")) {
			await this.execute(ev, () => bridge.runAction("chat", { message: text }));
		} else {
			await this.execute(ev, () => bridge.runAction("command", { command: text.replace(/^\//, "") }));
		}
	}
}
