/**
 * Shared types describing the JSON exchanged with the Stream Deck Bridge Fabric mod.
 * Keep in sync with `fabric-mod/src/main/java/com/maxbaumann/streamdeckbridge/StateCollector.java`.
 */

export type ConnectionKind = "none" | "singleplayer" | "multiplayer" | "realms";

export type GameModeName = "survival" | "creative" | "adventure" | "spectator";

export type PerspectiveName = "first_person" | "third_person_back" | "third_person_front";

export interface ServerInfo {
	/** Address as typed in the server list, e.g. `play.example.com:25565`. */
	address: string;
	/** Display name from the server list (may equal the address). */
	name: string;
	/** Online players, if the server reported it in the tab list. */
	players: number | null;
	/** Player cap, if known. */
	maxPlayers: number | null;
}

export interface PlayerInfo {
	name: string;
	x: number;
	y: number;
	z: number;
	/** Dimension id, e.g. `minecraft:overworld`. */
	dimension: string;
	/** Biome id, e.g. `minecraft:plains`. */
	biome: string | null;
	health: number;
	maxHealth: number;
	food: number;
	xpLevel: number;
	gamemode: GameModeName | null;
	/** Selected hotbar slot, 0-based (0–8). */
	selectedSlot: number;
}

export interface VolumeInfo {
	/** Master volume 0–1. */
	master: number;
	/** True when the master volume is 0. */
	muted: boolean;
	/** Every sound category (master, music, record, weather, block, hostile, neutral, player, ambient, voice, ui) as 0–1. */
	categories: Record<string, number>;
}

export interface GameState {
	/** Mod version string, for diagnostics. */
	modVersion: string;
	inGame: boolean;
	connection: ConnectionKind;
	server: ServerInfo | null;
	player: PlayerInfo | null;
	/** Latency in ms as shown in the tab list, or null when unknown. */
	ping: number | null;
	fps: number;
	fullscreen: boolean;
	perspective: PerspectiveName;
	hudHidden: boolean;
	debugHud: boolean;
	paused: boolean;
	/** Simple class name of the open screen, or null when no screen is open. */
	screen: string | null;
	volume: VolumeInfo;
	renderDistance: number;
	fov: number;
}

export interface ActionResult {
	ok: boolean;
	message?: string;
	error?: string;
}

export const GAME_MODES: readonly GameModeName[] = ["survival", "creative", "adventure", "spectator"];

export const PERSPECTIVES: readonly PerspectiveName[] = ["first_person", "third_person_back", "third_person_front"];
