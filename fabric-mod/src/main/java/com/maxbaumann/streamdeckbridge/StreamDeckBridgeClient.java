package com.maxbaumann.streamdeckbridge;

import com.maxbaumann.streamdeckbridge.action.ActionRegistry;
import com.maxbaumann.streamdeckbridge.api.BridgeServer;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * Client entry point: starts the local HTTP API that the Stream Deck plugin talks to.
 */
public final class StreamDeckBridgeClient implements ClientModInitializer {
	public static final String MOD_ID = "streamdeckbridge";
	public static final Logger LOGGER = LoggerFactory.getLogger("StreamDeckBridge");

	private static BridgeServer server;

	@Override
	public void onInitializeClient() {
		BridgeConfig config = BridgeConfig.load(FabricLoader.getInstance().getConfigDir().resolve(MOD_ID + ".json"));
		if (!config.enabled) {
			LOGGER.info("Stream Deck Bridge is disabled in config/{}.json", MOD_ID);
			return;
		}

		StateCollector state = new StateCollector(modVersion());
		ClientTickEvents.END_CLIENT_TICK.register(state::onClientTick);
		ClientLifecycleEvents.CLIENT_STOPPING.register(client -> stopServer());

		try {
			server = new BridgeServer(config, state, new ActionRegistry(config));
			server.start();
			LOGGER.info("Stream Deck Bridge listening on http://{}:{} ({} auth)", config.host, config.port,
					config.token.isBlank() ? "no" : "token");
		} catch (IOException e) {
			LOGGER.error("Could not start the Stream Deck Bridge HTTP server on {}:{}", config.host, config.port, e);
		}
	}

	private static void stopServer() {
		if (server != null) {
			server.stop();
			server = null;
		}
	}

	public static String modVersion() {
		return FabricLoader.getInstance().getModContainer(MOD_ID)
				.map(container -> container.getMetadata().getVersion().getFriendlyString())
				.orElse("dev");
	}
}
