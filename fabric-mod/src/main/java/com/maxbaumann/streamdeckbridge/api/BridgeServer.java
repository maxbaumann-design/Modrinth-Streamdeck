package com.maxbaumann.streamdeckbridge.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;
import com.maxbaumann.streamdeckbridge.BridgeConfig;
import com.maxbaumann.streamdeckbridge.StateCollector;
import com.maxbaumann.streamdeckbridge.StreamDeckBridgeClient;
import com.maxbaumann.streamdeckbridge.action.ActionRegistry;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Minimal JSON-over-HTTP server built on the JDK's {@link HttpServer}.
 *
 * <pre>
 *   GET  /               → mod info
 *   GET  /state          → current game state snapshot
 *   GET  /actions        → list of available actions
 *   POST /action/{name}  → run an action (JSON body with parameters)
 * </pre>
 */
public final class BridgeServer {
	private static final long ACTION_TIMEOUT_SECONDS = 8;
	private static final int MAX_BODY_BYTES = 64 * 1024;

	private final BridgeConfig config;
	private final StateCollector state;
	private final ActionRegistry actions;
	private final HttpServer server;
	private final ExecutorService executor;

	public BridgeServer(BridgeConfig config, StateCollector state, ActionRegistry actions) throws IOException {
		this.config = config;
		this.state = state;
		this.actions = actions;
		this.server = HttpServer.create(new InetSocketAddress(config.host, config.port), 0);
		this.executor = Executors.newVirtualThreadPerTaskExecutor();
		this.server.setExecutor(executor);
		this.server.createContext("/", this::handle);
	}

	public void start() {
		server.start();
	}

	public void stop() {
		server.stop(0);
		executor.shutdownNow();
	}

	private void handle(HttpExchange exchange) throws IOException {
		try {
			route(exchange);
		} catch (Exception e) {
			StreamDeckBridgeClient.LOGGER.error("Unhandled error while serving {}", exchange.getRequestURI(), e);
			respond(exchange, 500, ActionResult.error("Internal error: " + e).toJson());
		} finally {
			exchange.close();
		}
	}

	private void route(HttpExchange exchange) throws IOException, InterruptedException {
		String method = exchange.getRequestMethod();
		String path = exchange.getRequestURI().getPath();

		// Requests coming from a browser carry an Origin header; this API is for local tooling only,
		// so reject them outright to rule out cross-site request forgery from web pages.
		if (exchange.getRequestHeaders().getFirst("Origin") != null) {
			respond(exchange, 403, ActionResult.error("Browser requests are not allowed").toJson());
			return;
		}
		if (!authorized(exchange)) {
			exchange.getResponseHeaders().add("WWW-Authenticate", "Bearer");
			respond(exchange, 401, ActionResult.error("Missing or invalid token").toJson());
			return;
		}

		if (path.equals("/") || path.equals("/info")) {
			if (!method.equals("GET")) {
				respond(exchange, 405, ActionResult.error("Use GET").toJson());
				return;
			}
			JsonObject info = new JsonObject();
			info.addProperty("name", "Stream Deck Bridge");
			info.addProperty("version", state.modVersion());
			info.addProperty("api", 1);
			respond(exchange, 200, info);
			return;
		}

		if (path.equals("/state")) {
			if (!method.equals("GET")) {
				respond(exchange, 405, ActionResult.error("Use GET").toJson());
				return;
			}
			respondRaw(exchange, 200, state.json());
			return;
		}

		if (path.equals("/actions")) {
			if (!method.equals("GET")) {
				respond(exchange, 405, ActionResult.error("Use GET").toJson());
				return;
			}
			respond(exchange, 200, actions.describe());
			return;
		}

		if (path.startsWith("/action/")) {
			if (!method.equals("POST")) {
				respond(exchange, 405, ActionResult.error("Use POST").toJson());
				return;
			}
			String name = URLDecoder.decode(path.substring("/action/".length()), StandardCharsets.UTF_8);
			JsonObject body;
			try {
				body = readBody(exchange);
			} catch (JsonSyntaxException | IllegalStateException e) {
				respond(exchange, 400, ActionResult.error("Body must be a JSON object").toJson());
				return;
			}
			if (!actions.has(name)) {
				respond(exchange, 404, ActionResult.error("Unknown action: " + name).toJson());
				return;
			}
			ActionResult result;
			try {
				result = actions.execute(name, body).get(ACTION_TIMEOUT_SECONDS, TimeUnit.SECONDS);
			} catch (TimeoutException e) {
				respond(exchange, 504, ActionResult.error("Minecraft did not respond in time").toJson());
				return;
			} catch (ExecutionException e) {
				respond(exchange, 500, ActionResult.error("Action failed: " + e.getCause()).toJson());
				return;
			}
			respond(exchange, result.ok() ? 200 : 400, result.toJson());
			return;
		}

		respond(exchange, 404, ActionResult.error("Not found").toJson());
	}

	private boolean authorized(HttpExchange exchange) {
		if (config.token.isEmpty()) {
			return true;
		}
		String provided = null;
		String auth = exchange.getRequestHeaders().getFirst("Authorization");
		if (auth != null && auth.regionMatches(true, 0, "Bearer ", 0, 7)) {
			provided = auth.substring(7).trim();
		}
		if (provided == null) {
			provided = exchange.getRequestHeaders().getFirst("X-Api-Token");
		}
		if (provided == null) {
			String query = exchange.getRequestURI().getRawQuery();
			if (query != null) {
				for (String pair : query.split("&")) {
					int eq = pair.indexOf('=');
					if (eq > 0 && pair.substring(0, eq).equals("token")) {
						provided = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
					}
				}
			}
		}
		if (provided == null) {
			return false;
		}
		return MessageDigest.isEqual(provided.getBytes(StandardCharsets.UTF_8), config.token.getBytes(StandardCharsets.UTF_8));
	}

	private static JsonObject readBody(HttpExchange exchange) throws IOException {
		byte[] bytes = exchange.getRequestBody().readNBytes(MAX_BODY_BYTES + 1);
		if (bytes.length > MAX_BODY_BYTES) {
			throw new IllegalStateException("Body too large");
		}
		String text = new String(bytes, StandardCharsets.UTF_8).trim();
		if (text.isEmpty()) {
			return new JsonObject();
		}
		JsonElement element = JsonParser.parseString(text);
		if (!element.isJsonObject()) {
			throw new IllegalStateException("Not a JSON object");
		}
		return element.getAsJsonObject();
	}

	private static void respond(HttpExchange exchange, int status, JsonObject json) throws IOException {
		respondRaw(exchange, status, json.toString());
	}

	private static void respondRaw(HttpExchange exchange, int status, String json) throws IOException {
		byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
		exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
		exchange.getResponseHeaders().set("Cache-Control", "no-store");
		exchange.sendResponseHeaders(status, bytes.length);
		try (OutputStream out = exchange.getResponseBody()) {
			out.write(bytes);
		}
	}
}
