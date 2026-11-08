package com.maxbaumann.streamdeckbridge.api;

/** Thrown by actions for expected failures (bad input, not in a world, ...). The message is sent to the caller. */
public final class ActionException extends Exception {
	public ActionException(String message) {
		super(message);
	}
}
