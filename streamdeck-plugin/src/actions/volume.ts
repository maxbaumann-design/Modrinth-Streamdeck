import { action, type Action, type DialDownEvent, type DialRotateEvent, type KeyDownEvent, type TouchTapEvent } from "@elgato/streamdeck";
import { bridge, poller, type PollSnapshot } from "../bridge";
import { tile } from "../ui/images";
import { BridgeAction } from "./base";

type VolumeSettings = {
	/** Sound category as named by Minecraft: master, music, record, weather, block, hostile, neutral, player, ambient, voice, ui. */
	category?: string;
	/** Percent per dial tick. */
	step?: string | number;
};

const CATEGORY_LABEL: Record<string, string> = {
	master: "Master",
	music: "Music",
	record: "Jukebox",
	weather: "Weather",
	block: "Blocks",
	hostile: "Hostile",
	neutral: "Friendly",
	player: "Players",
	ambient: "Ambient",
	voice: "Voice",
	ui: "UI"
};

function stepOf(settings: VolumeSettings): number {
	const n = typeof settings.step === "number" ? settings.step : parseInt(String(settings.step ?? ""), 10);
	return Number.isFinite(n) && n > 0 ? Math.min(25, n) : 5;
}

@action({ UUID: "com.maxbaumann.streamdeckbridge.volume" })
export class VolumeAction extends BridgeAction<VolumeSettings> {
	/** Latest known volume per category (0–1), kept for the dial so rotation feels immediate. */
	readonly #volumes = new Map<string, number>();
	/** Last feedback sent per dial, to skip redundant updates. */
	readonly #lastFeedback = new Map<string, string>();

	protected override async render(action: Action<VolumeSettings>, settings: VolumeSettings, { state }: PollSnapshot): Promise<void> {
		const category = settings.category ?? "master";
		const known = state?.volume.categories[category];
		if (known !== undefined) {
			this.#volumes.set(category, known);
		}
		const value = this.#volumes.get(category);
		const percent = value === undefined ? null : Math.round(value * 100);
		const muted = percent === 0;
		const label = CATEGORY_LABEL[category] ?? category;

		if (action.isDial()) {
			const feedback = {
				title: label,
				value: percent === null ? "—" : `${percent}%`,
				indicator: { value: percent ?? 0 }
			};
			const key = JSON.stringify(feedback);
			if (this.#lastFeedback.get(action.id) !== key) {
				this.#lastFeedback.set(action.id, key);
				await action.setFeedback(feedback);
			}
			return;
		}

		await this.setImageIfChanged(
			action,
			tile({
				icon: muted ? "volume-muted" : "volume",
				value: percent === null ? undefined : `${percent}%`,
				label: muted ? `${label} muted` : label,
				offline: state === null
			})
		);
	}

	override onKeyDown(ev: KeyDownEvent<VolumeSettings>): Promise<void> {
		return this.execute(ev, () => bridge.runAction("volume", { category: ev.payload.settings.category ?? "master", action: "toggleMute" }), false);
	}

	override async onDialDown(ev: DialDownEvent<VolumeSettings>): Promise<void> {
		await this.#dial(ev.action, () => bridge.runAction("volume", { category: ev.payload.settings.category ?? "master", action: "toggleMute" }));
	}

	override async onTouchTap(ev: TouchTapEvent<VolumeSettings>): Promise<void> {
		await this.#dial(ev.action, () => bridge.runAction("volume", { category: ev.payload.settings.category ?? "master", action: "toggleMute" }));
	}

	override async onDialRotate(ev: DialRotateEvent<VolumeSettings>): Promise<void> {
		const category = ev.payload.settings.category ?? "master";
		const delta = (ev.payload.ticks * stepOf(ev.payload.settings)) / 100;
		const current = this.#volumes.get(category) ?? 1;
		const next = Math.min(1, Math.max(0, current + delta));
		this.#volumes.set(category, next);
		await ev.action.setFeedback({ value: `${Math.round(next * 100)}%`, indicator: { value: Math.round(next * 100) } });
		await this.#dial(ev.action, () => bridge.runAction("volume", { category, action: "set", value: next }));
	}

	async #dial(action: Action<VolumeSettings>, fn: () => Promise<unknown>): Promise<void> {
		try {
			await fn();
			poller.refreshSoon();
		} catch {
			if (action.isDial()) {
				await action.showAlert();
			}
		}
	}
}
