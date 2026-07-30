import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SESSION_TITLE_LENGTH,
  getSessionTitleError,
} from "../src/features/sessions/sessionTitle.js";

test("accepts a valid session title", () => {
  assert.equal(getSessionTitleError("Gateway walkthrough"), "");
});

test("rejects an empty session title", () => {
  assert.equal(getSessionTitleError("   "), "Session title is required.");
});

test("rejects a session title over the length limit", () => {
  assert.equal(
    getSessionTitleError("a".repeat(MAX_SESSION_TITLE_LENGTH + 1)),
    `Session title must be ${MAX_SESSION_TITLE_LENGTH} characters or fewer.`
  );
});
