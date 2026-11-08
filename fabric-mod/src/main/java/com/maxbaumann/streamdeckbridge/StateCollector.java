package com.maxbaumann.streamdeckbridge;

import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.level.GameType;

/**
 * Builds a JSON snapshot of everything the Stream Deck shows, on the client thread, a few times per second.
 * The HTTP server only ever reads the pre-serialised string, so no game state is touched off-thread.
 */
public final class StateCollector {
	private static final int TICKS_BETWEEN_UPDATES = 2;

	private final String modVersion;
	private volatile String json;
	private int ticks;

	public StateCollector(String modVersion) {
		this.modVersion = modVersion;
		JsonObject initial = new JsonObject();
		initial.addProperty("modVersion", modVersion);
		initial.addProperty("inGame", false);
		initial.addProperty("connection", "none");
		this.json = initial.toString();
	}

	public String modVersion() {
		return modVersion;
	}

	/** Latest snapshot as a JSON string. Safe to call from any thread. */
	public String json() {
		return json;
	}

	public void onClientTick(Minecraft mc) {
		if (++ticks % TICKS_BETWEEN_UPDATES != 0) {
			return;
		}
		try {
			json = collect(mc).toString();
		} catch (Exception e) {
			StreamDeckBridgeClient.LOGGER.debug("Failed to collect state", e);
		}
	}

	private JsonObject collect(Minecraft mc) {
		JsonObject root = new JsonObject();
		root.addProperty("modVersion", modVersion);

		LocalPlayer player = mc.player;
		ClientPacketListener connection = mc.getConnection();
		boolean inGame = mc.level != null && player != null;
		root.addProperty("inGame", inGame);

		ServerData serverData = mc.getCurrentServer();
		String connectionKind = "none";
		if (inGame) {
			if (mc.isLocalServer()) {
				connectionKind = "singleplayer";
			} else if (serverData != null && serverData.isRealm()) {
				connectionKind = "realms";
			} else {
				connectionKind = "multiplayer";
			}
		}
		root.addProperty("connection", connectionKind);

		if (inGame && !mc.isLocalServer() && serverData != null) {
			JsonObject server = new JsonObject();
			server.addProperty("address", serverData.ip);
			server.addProperty("name", serverData.name);
			if (connection != null) {
				server.addProperty("players", connection.getListedOnlinePlayers().size());
			} else {
				server.add("players", JsonNull.INSTANCE);
			}
			if (serverData.players != null) {
				server.addProperty("maxPlayers", serverData.players.max());
			} else {
				server.add("maxPlayers", JsonNull.INSTANCE);
			}
			root.add("server", server);
		} else {
			root.add("server", JsonNull.INSTANCE);
		}

		if (inGame) {
			JsonObject p = new JsonObject();
			p.addProperty("name", player.getName().getString());
			p.addProperty("x", player.getX());
			p.addProperty("y", player.getY());
			p.addProperty("z", player.getZ());
			p.addProperty("dimension", mc.level.dimension().identifier().toString());
			String biome = mc.level.getBiome(player.blockPosition()).unwrapKey()
					.map(key -> key.identifier().toString()).orElse(null);
			p.addProperty("biome", biome);
			p.addProperty("health", player.getHealth());
			p.addProperty("maxHealth", player.getMaxHealth());
			p.addProperty("food", player.getFoodData().getFoodLevel());
			p.addProperty("xpLevel", player.experienceLevel);
			GameType mode = mc.gameMode != null ? mc.gameMode.getPlayerMode() : null;
			p.addProperty("gamemode", mode != null ? mode.getName() : null);
			p.addProperty("selectedSlot", player.getInventory().getSelectedSlot());
			root.add("player", p);
		} else {
			root.add("player", JsonNull.INSTANCE);
		}

		Integer ping = null;
		if (inGame && connection != null) {
			PlayerInfo info = connection.getPlayerInfo(player.getUUID());
			if (info != null) {
				ping = info.getLatency();
			}
		}
		if (ping != null) {
			root.addProperty("ping", ping);
		} else {
			root.add("ping", JsonNull.INSTANCE);
		}

		root.addProperty("fps", mc.getFps());
		root.addProperty("fullscreen", mc.options.fullscreen().get());
		root.addProperty("perspective", perspectiveName(mc.options.getCameraType()));
		root.addProperty("hudHidden", mc.gui.hud.isHidden());
		root.addProperty("debugHud", mc.debugEntries.isOverlayVisible());

		Screen screen = mc.gui.screen();
		root.addProperty("paused", screen instanceof PauseScreen);
		root.addProperty("screen", screen != null ? screen.getClass().getSimpleName() : null);

		JsonObject volume = new JsonObject();
		JsonObject categories = new JsonObject();
		for (SoundSource source : SoundSource.values()) {
			categories.addProperty(source.getName(), mc.options.getSoundSourceVolume(source));
		}
		float master = mc.options.getSoundSourceVolume(SoundSource.MASTER);
		volume.addProperty("master", master);
		volume.addProperty("muted", master <= 0.0f);
		volume.add("categories", categories);
		root.add("volume", volume);

		root.addProperty("renderDistance", mc.options.renderDistance().get());
		root.addProperty("fov", mc.options.fov().get());
		return root;
	}

	public static String perspectiveName(CameraType type) {
		return switch (type) {
			case FIRST_PERSON -> "first_person";
			case THIRD_PERSON_BACK -> "third_person_back";
			case THIRD_PERSON_FRONT -> "third_person_front";
		};
	}

	public static CameraType perspectiveByName(String name) {
		return switch (name) {
			case "first_person" -> CameraType.FIRST_PERSON;
			case "third_person_back" -> CameraType.THIRD_PERSON_BACK;
			case "third_person_front" -> CameraType.THIRD_PERSON_FRONT;
			default -> null;
		};
	}
}
