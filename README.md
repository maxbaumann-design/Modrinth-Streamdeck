# Minecraft Stream Deck Bridge

Control Minecraft from an Elgato Stream Deck: switch game modes, disconnect, run commands, take
screenshots and keep an eye on your **ping, FPS and coordinates** – live on the keys.

The project has two parts that work together:

| Part | Folder | What it is |
| --- | --- | --- |
| **Stream Deck Bridge** (Fabric mod) | [`fabric-mod/`](fabric-mod) | Client-side mod that opens a small local HTTP API (`127.0.0.1:25580`). Published on Modrinth. |
| **Minecraft Bridge** (Stream Deck plugin) | [`streamdeck-plugin/`](streamdeck-plugin) | Plugin for the Stream Deck software with ready-made keys that talk to the mod. |

Nothing leaves your computer: the mod only listens on `localhost`, and the plugin polls it a few
times per second.

## Keys

| Key | What it does | Shows |
| --- | --- | --- |
| **Game Mode** | Set Survival / Creative / Adventure / Spectator, cycle through all (like F3+F4) or toggle Survival ⇄ Creative. Sends `/gamemode`, so you need the permission on servers. | Current mode, highlighted when it matches the key |
| **Disconnect** | Leave the server, or save and quit the singleplayer world. Optional "press twice" safety. | Connection state |
| **Connect to Server** | Join a server with one press (leaves the current world first). | Highlighted while connected to that server |
| **Run Command / Chat** | Run any command (`time set day`, `tp @s 0 100 0`, …) or send a chat message. | Your label |
| **Perspective** | Cycle like F5, or jump straight to first person / third person / front view. | Current perspective |
| **Fullscreen** | Toggle fullscreen (F11). | On / off |
| **Screenshot** | Take a screenshot (F2). | – |
| **Hide HUD** | Show or hide the HUD (F1). | Hidden / shown |
| **Debug Screen** | Show or hide the F3 overlay. | On / off |
| **Pause / Resume** | Open or close the pause menu. | Paused / running |
| **Volume** | Mute / unmute a sound category. On a Stream Deck + dial: rotate to adjust, press to mute. | Volume in % |
| **Hotbar Slot** | Select hotbar slot 1–9. | Highlighted when selected |
| **Ping** | – | Latency to the server in ms, colour-coded |
| **FPS** | – | Current frame rate, colour-coded |
| **Coordinates** | Optionally sends your position to chat on press. | X / Y / Z and dimension |
| **Server Status** | – | Server name, player count and address |

All keys show a warning icon while Minecraft (or the mod) is not running.

## Requirements

| | Version |
| --- | --- |
| Minecraft | 26.3 (Java Edition) |
| Fabric Loader | 0.20.1 or newer |
| Fabric API | any 26.3 build |
| Java | 25 (ships with the Minecraft launcher) |
| Stream Deck software | 7.1 or newer, Windows 10+ or macOS 12+ |

## Installation

1. **Mod** – download `streamdeck-bridge-<version>.jar` from Modrinth or the
   [releases page](https://github.com/maxbaumann-design/Modrinth-Streamdeck/releases) and drop it into your
   `mods` folder together with Fabric API. Start the game once; the mod creates
   `config/streamdeckbridge.json` and logs `Stream Deck Bridge listening on http://127.0.0.1:25580`.
2. **Plugin** – download `com.maxbaumann.streamdeckbridge.streamDeckPlugin` from the releases page and
   double-click it. The Stream Deck software installs it and adds a **Minecraft Bridge** category.
3. Drag keys onto your Stream Deck. The default connection settings (`127.0.0.1`, port `25580`, no token)
   match the mod's defaults, so nothing else is needed.

## Mod configuration

`config/streamdeckbridge.json`:

```json
{
  "enabled": true,
  "host": "127.0.0.1",
  "port": 25580,
  "token": "",
  "chatFeedback": false
}
```

| Field | Meaning |
| --- | --- |
| `enabled` | Set to `false` to keep the mod installed but never open the port. |
| `host` | Interface to listen on. Keep `127.0.0.1` unless the Stream Deck software runs on another PC. |
| `port` | TCP port. Change it in the plugin's **Connection** section as well. |
| `token` | Optional secret. When set, requests need `Authorization: Bearer <token>`; enter it in the plugin's **Connection** section. Strongly recommended if `host` is not a loopback address. |
| `chatFeedback` | Show a `[Stream Deck] …` chat line whenever a key triggers an action. |

The **Connection** section (host, port, token, refresh interval) is shared by all keys and appears at
the bottom of every key's settings in the Stream Deck software.

## HTTP API

The mod's API can also be used from other tools (Bitfocus Companion, generic HTTP Stream Deck
plugins, scripts). All responses are JSON.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Mod name and version |
| `GET` | `/state` | Current game state snapshot (see below) |
| `GET` | `/actions` | Available actions with their parameters |
| `POST` | `/action/<name>` | Run an action; parameters as a JSON object in the body |

```bash
curl http://127.0.0.1:25580/state
```

```bash
curl -X POST http://127.0.0.1:25580/action/gamemode -H "Content-Type: application/json" -d '{"mode":"creative"}'
```

```bash
curl -X POST http://127.0.0.1:25580/action/command -H "Content-Type: application/json" -d '{"command":"time set day"}'
```

Actions: `gamemode`, `disconnect`, `connect`, `command`, `chat`, `perspective`, `fullscreen`,
`screenshot`, `hud`, `debug`, `pause`, `volume`, `hotbar`, `open_chat`, `reload_resources`.
Every action answers `{"ok":true,"message":"…"}` or `{"ok":false,"error":"…"}` (HTTP 400).

`/state` excerpt:

```json
{
  "inGame": true,
  "connection": "multiplayer",
  "server": { "address": "play.example.com", "name": "My server", "players": 12, "maxPlayers": 100 },
  "player": { "name": "Steve", "x": 12.5, "y": 64.0, "z": -301.2, "dimension": "minecraft:overworld",
              "biome": "minecraft:plains", "health": 20.0, "maxHealth": 20.0, "food": 20, "xpLevel": 7,
              "gamemode": "survival", "selectedSlot": 0 },
  "ping": 42,
  "fps": 144,
  "fullscreen": false,
  "perspective": "first_person",
  "hudHidden": false,
  "debugHud": false,
  "paused": false,
  "screen": null,
  "volume": { "master": 1.0, "muted": false, "categories": { "master": 1.0, "music": 0.5 } },
  "renderDistance": 12,
  "fov": 70
}
```

Requests that carry a browser `Origin` header are rejected, so web pages cannot trigger actions.

## Building from source

Mod (needs JDK 25):

```bash
cd fabric-mod
./gradlew build
```

The jar ends up in `fabric-mod/build/libs/`. `./gradlew runClient` starts a development client.

Plugin (needs Node.js 20+; the Stream Deck software ships its own Node 24 runtime):

```bash
cd streamdeck-plugin
npm ci
npm run build
npm run pack
```

`npm run build` bundles `src/` into `com.maxbaumann.streamdeckbridge.sdPlugin/bin/plugin.js`;
`npm run pack` creates `dist/com.maxbaumann.streamdeckbridge.streamDeckPlugin`. During development,
`npm run watch` rebuilds and restarts the plugin on every change (requires the
[Stream Deck CLI](https://github.com/elgatosf/cli) link: `streamdeck link com.maxbaumann.streamdeckbridge.sdPlugin`).

Icons are generated from `streamdeck-plugin/scripts/icons.mjs` with `node scripts/generate-icons.mjs`
(the PNG logos need Playwright/Chromium; the generated files are committed).

GitHub Actions build both parts on every push and attach them to a GitHub release when a `v*` tag is
pushed (see [`.github/workflows`](.github/workflows)). The release workflow contains an optional,
commented-out step that publishes the mod to Modrinth.

## Publishing on Modrinth

Upload only the mod jar (`streamdeck-bridge-<version>.jar`, not the `-sources` jar):

- Loader: **Fabric** · Game version: **26.3** · Environment: **client-side** (server: unsupported)
- Dependency: **Fabric API** (required)
- Link to the GitHub release for the matching Stream Deck plugin download.

## Security notes

- The API is bound to `127.0.0.1` by default and is therefore only reachable from your own computer.
- Set a `token` if you bind to another interface; the mod logs a warning otherwise.
- Browser-originated requests are refused, and request bodies are limited to 64 KB.
- Game-mode changes are plain `/gamemode` commands; the server still enforces its permissions.

## Deutsch – Kurzanleitung

1. `streamdeck-bridge-<version>.jar` (von Modrinth oder den GitHub-Releases) zusammen mit Fabric API in
   den `mods`-Ordner legen und Minecraft 26.3 mit Fabric starten.
2. `com.maxbaumann.streamdeckbridge.streamDeckPlugin` herunterladen und doppelklicken – die
   Stream-Deck-Software installiert das Plugin und zeigt die Kategorie **Minecraft Bridge**.
3. Tasten aufs Stream Deck ziehen. Die Standardverbindung (`127.0.0.1:25580`, kein Token) passt zur
   Mod-Konfiguration in `config/streamdeckbridge.json`; dort lassen sich Port und Token ändern.

## License

[MIT](LICENSE)
