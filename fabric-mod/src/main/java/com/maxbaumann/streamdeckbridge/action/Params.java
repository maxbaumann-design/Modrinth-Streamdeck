package com.maxbaumann.streamdeckbridge.action;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.maxbaumann.streamdeckbridge.api.ActionException;

/** Small helpers for reading loosely typed JSON request bodies. */
final class Params {
	private Params() {
	}

	static String string(JsonObject body, String key, String fallback) {
		JsonElement element = body.get(key);
		if (element == null || element.isJsonNull()) {
			return fallback;
		}
		if (element.isJsonPrimitive()) {
			return element.getAsString();
		}
		return fallback;
	}

	static String requireString(JsonObject body, String key) throws ActionException {
		String value = string(body, key, "").trim();
		if (value.isEmpty()) {
			throw new ActionException("Missing parameter: " + key);
		}
		return value;
	}

	static double number(JsonObject body, String key, double fallback) throws ActionException {
		JsonElement element = body.get(key);
		if (element == null || element.isJsonNull()) {
			return fallback;
		}
		try {
			return element.getAsDouble();
		} catch (RuntimeException e) {
			throw new ActionException("Parameter " + key + " must be a number");
		}
	}

	static boolean bool(JsonObject body, String key, boolean fallback) {
		JsonElement element = body.get(key);
		if (element == null || element.isJsonNull() || !element.isJsonPrimitive()) {
			return fallback;
		}
		JsonElement primitive = element;
		if (primitive.getAsJsonPrimitive().isBoolean()) {
			return primitive.getAsBoolean();
		}
		return Boolean.parseBoolean(primitive.getAsString());
	}
}
