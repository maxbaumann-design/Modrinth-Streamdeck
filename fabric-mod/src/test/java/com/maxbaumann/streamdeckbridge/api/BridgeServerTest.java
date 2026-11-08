package com.maxbaumann.streamdeckbridge.api;

import com.maxbaumann.streamdeckbridge.BridgeConfig;
import com.maxbaumann.streamdeckbridge.StateCollector;
import com.maxbaumann.streamdeckbridge.action.ActionRegistry;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the HTTP layer (routing, authentication, error handling) without a running game.
 * Actions themselves need the Minecraft client thread and are not executed here.
 */
class BridgeServerTest {
	private static final String TOKEN = "s3cret";
	private static BridgeServer server;
	private static String baseUrl;
	private static final HttpClient CLIENT = HttpClient.newHttpClient();

	@BeforeAll
	static void startServer() throws IOException {
		BridgeConfig config = new BridgeConfig();
		config.host = "127.0.0.1";
		config.token = TOKEN;
		try (ServerSocket socket = new ServerSocket(0)) {
			config.port = socket.getLocalPort();
		}
		server = new BridgeServer(config, new StateCollector("test"), new ActionRegistry(config));
		server.start();
		baseUrl = "http://127.0.0.1:" + config.port;
	}

	@AfterAll
	static void stopServer() {
		server.stop();
	}

	@Test
	void rejectsRequestsWithoutToken() throws Exception {
		HttpResponse<String> response = send(HttpRequest.newBuilder(URI.create(baseUrl + "/state")).GET(), false);
		assertEquals(401, response.statusCode());
		assertTrue(response.body().contains("\"ok\":false"));
	}

	@Test
	void rejectsWrongToken() throws Exception {
		HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/state"))
				.header("Authorization", "Bearer nope").GET().build();
		assertEquals(401, CLIENT.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
	}

	@Test
	void acceptsTokenAsQueryParameter() throws Exception {
		HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/state?token=" + TOKEN)).GET().build();
		assertEquals(200, CLIENT.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
	}

	@Test
	void servesInitialState() throws Exception {
		HttpResponse<String> response = send(HttpRequest.newBuilder(URI.create(baseUrl + "/state")).GET(), true);
		assertEquals(200, response.statusCode());
		assertEquals("application/json; charset=utf-8", response.headers().firstValue("Content-Type").orElse(""));
		assertTrue(response.body().contains("\"inGame\":false"), response.body());
		assertTrue(response.body().contains("\"modVersion\":\"test\""), response.body());
	}

	@Test
	void servesInfoAndActionList() throws Exception {
		HttpResponse<String> info = send(HttpRequest.newBuilder(URI.create(baseUrl + "/")).GET(), true);
		assertEquals(200, info.statusCode());
		assertTrue(info.body().contains("Stream Deck Bridge"), info.body());

		HttpResponse<String> actions = send(HttpRequest.newBuilder(URI.create(baseUrl + "/actions")).GET(), true);
		assertEquals(200, actions.statusCode());
		for (String name : new String[] {"gamemode", "disconnect", "connect", "command", "chat", "perspective", "fullscreen",
				"screenshot", "hud", "debug", "pause", "volume", "hotbar"}) {
			assertTrue(actions.body().contains("\"name\":\"" + name + "\""), "missing action " + name);
		}
	}

	@Test
	void unknownActionIs404() throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + "/action/does-not-exist"))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString("{}"));
		HttpResponse<String> response = send(request, true);
		assertEquals(404, response.statusCode());
		assertTrue(response.body().contains("Unknown action"), response.body());
	}

	@Test
	void malformedBodyIs400() throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + "/action/gamemode"))
				.POST(HttpRequest.BodyPublishers.ofString("[1, 2"));
		assertEquals(400, send(request, true).statusCode());
	}

	@Test
	void wrongMethodIs405() throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + "/state"))
				.POST(HttpRequest.BodyPublishers.noBody());
		assertEquals(405, send(request, true).statusCode());

		HttpRequest.Builder get = HttpRequest.newBuilder(URI.create(baseUrl + "/action/gamemode")).GET();
		assertEquals(405, send(get, true).statusCode());
	}

	@Test
	void browserOriginIsRejected() throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + "/state"))
				.header("Origin", "https://evil.example").GET();
		assertEquals(403, send(request, true).statusCode());
	}

	@Test
	void unknownPathIs404() throws Exception {
		assertEquals(404, send(HttpRequest.newBuilder(URI.create(baseUrl + "/nope")).GET(), true).statusCode());
	}

	private static HttpResponse<String> send(HttpRequest.Builder builder, boolean withToken) throws Exception {
		if (withToken) {
			builder.header("Authorization", "Bearer " + TOKEN);
		}
		return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}
}
