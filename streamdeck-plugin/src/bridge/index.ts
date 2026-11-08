import { BridgeClient } from "./client";
import { StatePoller } from "./poller";
import { globalSettings } from "./settings";

export const bridge = new BridgeClient(() => globalSettings.current);
export const poller = new StatePoller(bridge, () => globalSettings.current.pollIntervalMs);

globalSettings.onChange(() => poller.restart());

export { BridgeError } from "./client";
export { globalSettings } from "./settings";
export type { PollSnapshot } from "./poller";
export * from "./types";
