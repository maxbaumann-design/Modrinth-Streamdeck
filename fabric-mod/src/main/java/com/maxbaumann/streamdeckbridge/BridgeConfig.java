package com.maxbaumann.streamdeckbridge;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Settings stored in {@code config/streamdeckbridge.json}. The file is created with defaults on first launch.
 */
public final class BridgeConfig {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

	/** Set to false to keep the mod installed but never open the HTTP port. */
	public boolean enabled = true;
	/** Interface to bind. Keep this on the loopback address unless the Stream Deck software runs on another machine. */
	public String host = "127.0.0.1";
	/** TCP port of the local API. Must match the port configured in the Stream Deck plugin. */
	public int port = 25580;
	/** Optional shared secret. When set, requests must carry {@code Authorization: Bearer <token>}. */
	public String token = "";
	/** Show a chat message in game when an action is triggered from the Stream Deck. */
	public boolean chatFeedback = false;

	public static BridgeConfig load(Path file) {
		BridgeConfig config = null;
		if (Files.exists(file)) {
			try {
				config = GSON.fromJson(Files.readString(file, StandardCharsets.UTF_8), BridgeConfig.class);
			} catch (IOException | JsonParseException e) {
				StreamDeckBridgeClient.LOGGER.warn("Could not read {}, using defaults", file, e);
			}
		}
		if (config == null) {
			config = new BridgeConfig();
		}
		config.sanitize();
		config.save(file);
		return config;
	}

	private void sanitize() {
		if (host == null || host.isBlank()) {
			host = "127.0.0.1";
		}
		if (port < 1 || port > 65535) {
			StreamDeckBridgeClient.LOGGER.warn("Invalid port {} in config, falling back to 25580", port);
			port = 25580;
		}
		if (token == null) {
			token = "";
		}
		token = token.trim();
		if (!isLoopback(host) && token.isEmpty()) {
			StreamDeckBridgeClient.LOGGER.warn("Stream Deck Bridge is bound to {} without a token: anyone on your network can control the game!", host);
		}
	}

	private static boolean isLoopback(String host) {
		return host.equals("127.0.0.1") || host.equals("localhost") || host.equals("::1") || host.startsWith("127.");
	}

	private void save(Path file) {
		try {
			Files.createDirectories(file.getParent());
			Files.writeString(file, GSON.toJson(this) + System.lineSeparator(), StandardCharsets.UTF_8);
		} catch (IOException e) {
			StreamDeckBridgeClient.LOGGER.warn("Could not write {}", file, e);
		}
	}
}
