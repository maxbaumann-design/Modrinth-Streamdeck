package com.maxbaumann.streamdeckbridge.action;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.maxbaumann.streamdeckbridge.BridgeConfig;
import com.maxbaumann.streamdeckbridge.StreamDeckBridgeClient;
import com.maxbaumann.streamdeckbridge.api.ActionException;
import com.maxbaumann.streamdeckbridge.api.ActionResult;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Maps action names from the HTTP API to handlers, and runs them on the Minecraft client thread.
 */
public final class ActionRegistry {
	@FunctionalInterface
	public interface Handler {
		ActionResult run(Minecraft mc, JsonObject body) throws ActionException;
	}

	private record Definition(String name, String description, String parameters, Handler handler) {
	}

	private final Map<String, Definition> definitions = new LinkedHashMap<>();
	private final BridgeConfig config;

	public ActionRegistry(BridgeConfig config) {
		this.config = config;
		register("gamemode", "Change the game mode (sends /gamemode, so you need the permission on servers).",
				"mode: survival | creative | adventure | spectator | cycle | toggle", ClientActions::gamemode);
		register("disconnect", "Leave the current server or world and return to the menu.", "-", ClientActions::disconnect);
		register("connect", "Connect to a multiplayer server.", "address: host[:port], name?: string", ClientActions::connect);
		register("command", "Run a command (without the leading slash).", "command: string", ClientActions::command);
		register("chat", "Send a chat message (a leading slash runs it as a command).", "message: string", ClientActions::chat);
		register("perspective", "Change the camera perspective (F5).",
				"mode: first_person | third_person_back | third_person_front | cycle", ClientActions::perspective);
		register("fullscreen", "Toggle fullscreen (F11).", "mode?: toggle | on | off", ClientActions::fullscreen);
		register("screenshot", "Take a screenshot (F2).", "-", ClientActions::screenshot);
		register("hud", "Show or hide the HUD (F1).", "mode?: toggle | show | hide", ClientActions::hud);
		register("debug", "Show or hide the debug overlay (F3).", "mode?: toggle | show | hide", ClientActions::debug);
		register("pause", "Open or close the pause menu.", "mode?: toggle | pause | resume", ClientActions::pause);
		register("volume", "Change a sound category's volume or mute it.",
				"category?: master | music | ..., action: set | adjust | mute | unmute | toggleMute, value?: 0-1, delta?: -1..1",
				ClientActions::volume);
		register("hotbar", "Select a hotbar slot.", "slot: 1-9", ClientActions::hotbar);
		register("open_chat", "Open the chat box, optionally pre-filled.", "text?: string", ClientActions::openChat);
		register("reload_resources", "Reload resource packs (F3+T).", "-", ClientActions::reloadResources);
	}

	private void register(String name, String description, String parameters, Handler handler) {
		definitions.put(name, new Definition(name, description, parameters, handler));
	}

	public boolean has(String name) {
		return definitions.containsKey(name);
	}

	/** Runs the action on the client thread. The future never completes exceptionally for expected failures. */
	public CompletableFuture<ActionResult> execute(String name, JsonObject body) {
		Definition definition = definitions.get(name);
		if (definition == null) {
			return CompletableFuture.completedFuture(ActionResult.error("Unknown action: " + name));
		}
		Minecraft mc = Minecraft.getInstance();
		return mc.submit(() -> {
			try {
				ActionResult result = definition.handler().run(mc, body);
				StreamDeckBridgeClient.LOGGER.debug("Action {} -> {}", name, result);
				if (config.chatFeedback && result.ok() && result.message() != null && mc.player != null) {
					mc.gui.hud.getChat().addClientSystemMessage(Component.literal("[Stream Deck] " + result.message()));
				}
				return result;
			} catch (ActionException e) {
				return ActionResult.error(e.getMessage());
			} catch (RuntimeException e) {
				StreamDeckBridgeClient.LOGGER.error("Action {} threw", name, e);
				return ActionResult.error(e.toString());
			}
		});
	}

	public JsonObject describe() {
		JsonArray list = new JsonArray();
		for (Definition definition : definitions.values()) {
			JsonObject entry = new JsonObject();
			entry.addProperty("name", definition.name());
			entry.addProperty("description", definition.description());
			entry.addProperty("parameters", definition.parameters());
			entry.addProperty("endpoint", "POST /action/" + definition.name());
			list.add(entry);
		}
		JsonObject root = new JsonObject();
		root.add("actions", list);
		return root;
	}
}
