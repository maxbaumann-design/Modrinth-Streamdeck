/*
 * Shared "Connection" section appended to every property inspector. The values are stored as
 * global settings (shared by all keys) and must match config/streamdeckbridge.json in Minecraft.
 */
document.currentScript.insertAdjacentHTML(
	"beforebegin",
	`
	<sdpi-item label="Connection">
		<div style="opacity: 0.7; line-height: 1.4;">
			Shared by all Minecraft keys. Defaults match the mod's <code>config/streamdeckbridge.json</code>.
		</div>
	</sdpi-item>
	<sdpi-item label="Host">
		<sdpi-textfield setting="host" global placeholder="127.0.0.1"></sdpi-textfield>
	</sdpi-item>
	<sdpi-item label="Port">
		<sdpi-textfield setting="port" global placeholder="25580" pattern="^\\d{1,5}$"></sdpi-textfield>
	</sdpi-item>
	<sdpi-item label="API token">
		<sdpi-password setting="token" global placeholder="Optional, see mod config"></sdpi-password>
	</sdpi-item>
	<sdpi-item label="Refresh (ms)">
		<sdpi-range setting="pollIntervalMs" global min="250" max="5000" step="250" default="1000" showlabels></sdpi-range>
	</sdpi-item>
	`
);
