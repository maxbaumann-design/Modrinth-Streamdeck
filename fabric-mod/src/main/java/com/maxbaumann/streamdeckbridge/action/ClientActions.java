package com.maxbaumann.streamdeckbridge.action;

import com.google.gson.JsonObject;
import com.maxbaumann.streamdeckbridge.StateCollector;
import com.maxbaumann.streamdeckbridge.api.ActionException;
import com.maxbaumann.streamdeckbridge.api.ActionResult;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.OptionInstance;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.components.ChatComponent;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.level.GameType;

import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;

/**
 * The actual game interactions. Every method runs on the Minecraft client thread.
 */
final class ClientActions {
	/** Volumes remembered while a category is muted, so unmuting restores the previous level. */
	private static final Map<SoundSource, Double> MUTED_VOLUMES = new EnumMap<>(SoundSource.class);

	private ClientActions() {
	}

	static ActionResult gamemode(Minecraft mc, JsonObject body) throws ActionException {
		LocalPlayer player = requirePlayer(mc);
		String mode = Params.string(body, "mode", "cycle").trim().toLowerCase(Locale.ROOT);
		GameType current = mc.gameMode != null ? mc.gameMode.getPlayerMode() : GameType.SURVIVAL;
		GameType target = switch (mode) {
			case "cycle" -> GameType.byId((current.getId() + 1) % GameType.values().length);
			case "toggle" -> current.isCreative() ? GameType.SURVIVAL : GameType.CREATIVE;
			default -> GameType.byName(mode, null);
		};
		if (target == null) {
			throw new ActionException("Unknown game mode: " + mode);
		}
		// There is no client-side way to switch modes; the server decides, exactly like F3+F4 does.
		player.connection.sendCommand("gamemode " + target.getName());
		return ActionResult.ok("Requested game mode " + target.getName());
	}

	static ActionResult disconnect(Minecraft mc, JsonObject body) throws ActionException {
		if (mc.level == null) {
			throw new ActionException("Not in a world");
		}
		boolean local = mc.isLocalServer();
		// Same call the pause menu's "Disconnect" / "Save and Quit" button uses; it picks the follow-up screen itself.
		mc.disconnectFromWorld(ClientLevel.DEFAULT_QUIT_MESSAGE);
		return ActionResult.ok(local ? "Left the world" : "Disconnected from the server");
	}

	static ActionResult connect(Minecraft mc, JsonObject body) throws ActionException {
		String address = Params.requireString(body, "address");
		if (!ServerAddress.isValidAddress(address)) {
			throw new ActionException("Invalid server address: " + address);
		}
		String name = Params.string(body, "name", "").trim();
		if (name.isEmpty()) {
			name = address;
		}
		if (mc.level != null) {
			mc.disconnectFromWorld(ClientLevel.DEFAULT_QUIT_MESSAGE);
		}
		Screen parent = new JoinMultiplayerScreen(new TitleScreen());
		ServerData data = new ServerData(name, address, ServerData.Type.OTHER);
		ConnectScreen.startConnecting(parent, mc, ServerAddress.parseString(address), data, false, null);
		return ActionResult.ok("Connecting to " + address);
	}

	static ActionResult command(Minecraft mc, JsonObject body) throws ActionException {
		LocalPlayer player = requirePlayer(mc);
		String command = stripSlash(Params.requireString(body, "command"));
		if (command.isEmpty()) {
			throw new ActionException("Empty command");
		}
		player.connection.sendCommand(command);
		return ActionResult.ok("Ran /" + command);
	}

	static ActionResult chat(Minecraft mc, JsonObject body) throws ActionException {
		LocalPlayer player = requirePlayer(mc);
		String message = Params.requireString(body, "message");
		if (message.startsWith("/")) {
			String command = stripSlash(message);
			player.connection.sendCommand(command);
			return ActionResult.ok("Ran /" + command);
		}
		if (message.length() > 256) {
			throw new ActionException("Chat messages are limited to 256 characters");
		}
		player.connection.sendChat(message);
		return ActionResult.ok("Sent chat message");
	}

	static ActionResult perspective(Minecraft mc, JsonObject body) throws ActionException {
		String mode = Params.string(body, "mode", "cycle").trim().toLowerCase(Locale.ROOT);
		CameraType current = mc.options.getCameraType();
		CameraType target = mode.equals("cycle") ? current.cycle() : StateCollector.perspectiveByName(mode);
		if (target == null) {
			throw new ActionException("Unknown perspective: " + mode);
		}
		mc.options.setCameraType(target);
		// Mirrors the F5 handling in Minecraft#handleKeybinds (spectator shader on/off).
		if (current.isFirstPerson() != target.isFirstPerson()) {
			mc.gameRenderer.checkEntityPostEffect(target.isFirstPerson() ? mc.getCameraEntity() : null);
		}
		return ActionResult.ok("Perspective: " + StateCollector.perspectiveName(target));
	}

	static ActionResult fullscreen(Minecraft mc, JsonObject body) {
		String mode = Params.string(body, "mode", "toggle").trim().toLowerCase(Locale.ROOT);
		OptionInstance<Boolean> option = mc.options.fullscreen();
		boolean current = option.get();
		boolean target = switch (mode) {
			case "on", "true" -> true;
			case "off", "false" -> false;
			default -> !current;
		};
		if (target != current) {
			// The option's change callback applies the new mode to the window (same path as the video settings toggle).
			option.set(target);
			mc.options.save();
		}
		return ActionResult.ok(target ? "Fullscreen on" : "Fullscreen off");
	}

	static ActionResult screenshot(Minecraft mc, JsonObject body) {
		Screenshot.grab(mc, false);
		return ActionResult.ok("Screenshot saved");
	}

	static ActionResult hud(Minecraft mc, JsonObject body) {
		String mode = Params.string(body, "mode", "toggle").trim().toLowerCase(Locale.ROOT);
		boolean hidden = mc.gui.hud.isHidden();
		boolean target = switch (mode) {
			case "hide" -> true;
			case "show" -> false;
			default -> !hidden;
		};
		if (target != hidden) {
			mc.gui.hud.toggle();
		}
		return ActionResult.ok(target ? "HUD hidden" : "HUD shown");
	}

	static ActionResult debug(Minecraft mc, JsonObject body) {
		String mode = Params.string(body, "mode", "toggle").trim().toLowerCase(Locale.ROOT);
		boolean visible = mc.debugEntries.isOverlayVisible();
		boolean target = switch (mode) {
			case "show" -> true;
			case "hide" -> false;
			default -> !visible;
		};
		if (target != visible) {
			mc.debugEntries.setOverlayVisible(target);
		}
		return ActionResult.ok(target ? "Debug overlay shown" : "Debug overlay hidden");
	}

	static ActionResult pause(Minecraft mc, JsonObject body) throws ActionException {
		if (mc.level == null) {
			throw new ActionException("Not in a world");
		}
		String mode = Params.string(body, "mode", "toggle").trim().toLowerCase(Locale.ROOT);
		boolean paused = mc.gui.screen() instanceof PauseScreen;
		boolean target = switch (mode) {
			case "pause" -> true;
			case "resume" -> false;
			default -> !paused;
		};
		if (target && !paused) {
			if (mc.gui.screen() != null) {
				mc.gui.setScreen(null);
			}
			mc.pauseGame(false);
		} else if (!target && paused) {
			mc.gui.setScreen(null);
		}
		return ActionResult.ok(target ? "Game paused" : "Game resumed");
	}

	static ActionResult volume(Minecraft mc, JsonObject body) throws ActionException {
		String categoryName = Params.string(body, "category", "master").trim().toLowerCase(Locale.ROOT);
		SoundSource source = null;
		for (SoundSource candidate : SoundSource.values()) {
			if (candidate.getName().equals(categoryName)) {
				source = candidate;
			}
		}
		if (source == null) {
			throw new ActionException("Unknown sound category: " + categoryName);
		}
		OptionInstance<Double> option = mc.options.getSoundSourceOptionInstance(source);
		double current = option.get();
		String action = Params.string(body, "action", "toggleMute").trim();
		double target = switch (action) {
			case "set" -> clamp(Params.number(body, "value", current));
			case "adjust" -> clamp(current + Params.number(body, "delta", 0));
			case "mute" -> mute(source, current);
			case "unmute" -> unmute(source);
			case "toggleMute" -> current > 0 ? mute(source, current) : unmute(source);
			default -> throw new ActionException("Unknown volume action: " + action);
		};
		option.set(target);
		mc.options.save();
		return ActionResult.ok(source.getName() + " volume " + Math.round(target * 100) + "%");
	}

	static ActionResult hotbar(Minecraft mc, JsonObject body) throws ActionException {
		LocalPlayer player = requirePlayer(mc);
		int slot = (int) Params.number(body, "slot", 0);
		if (slot < 1 || slot > 9) {
			throw new ActionException("slot must be between 1 and 9");
		}
		player.getInventory().setSelectedSlot(slot - 1);
		return ActionResult.ok("Selected hotbar slot " + slot);
	}

	static ActionResult openChat(Minecraft mc, JsonObject body) throws ActionException {
		requirePlayer(mc);
		String text = Params.string(body, "text", "");
		if (text.isEmpty()) {
			mc.gui.openChatScreen(ChatComponent.ChatMethod.MESSAGE);
		} else {
			mc.gui.openChatAndAddText(ChatComponent.ChatMethod.MESSAGE, text);
		}
		return ActionResult.ok("Chat opened");
	}

	static ActionResult reloadResources(Minecraft mc, JsonObject body) {
		mc.reloadResourcePacks();
		return ActionResult.ok("Reloading resource packs");
	}

	private static LocalPlayer requirePlayer(Minecraft mc) throws ActionException {
		if (mc.player == null || mc.level == null) {
			throw new ActionException("Not in a world");
		}
		return mc.player;
	}

	private static String stripSlash(String text) {
		String trimmed = text.trim();
		return trimmed.startsWith("/") ? trimmed.substring(1).trim() : trimmed;
	}

	private static double clamp(double value) {
		return Math.max(0.0, Math.min(1.0, value));
	}

	private static double mute(SoundSource source, double current) {
		if (current > 0) {
			MUTED_VOLUMES.put(source, current);
		}
		return 0.0;
	}

	private static double unmute(SoundSource source) {
		Double previous = MUTED_VOLUMES.remove(source);
		return previous != null && previous > 0 ? previous : 1.0;
	}
}
