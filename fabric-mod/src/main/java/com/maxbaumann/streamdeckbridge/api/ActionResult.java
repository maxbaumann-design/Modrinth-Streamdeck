package com.maxbaumann.streamdeckbridge.api;

import com.google.gson.JsonObject;

/** Outcome of an action, serialised as {@code {"ok":true,"message":"..."}} or {@code {"ok":false,"error":"..."}}. */
public record ActionResult(boolean ok, String message, String error) {
	public static ActionResult ok(String message) {
		return new ActionResult(true, message, null);
	}

	public static ActionResult error(String error) {
		return new ActionResult(false, null, error);
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("ok", ok);
		if (message != null) {
			json.addProperty("message", message);
		}
		if (error != null) {
			json.addProperty("error", error);
		}
		return json;
	}
}
