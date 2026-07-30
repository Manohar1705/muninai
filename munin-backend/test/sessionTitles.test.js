const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_SESSION_TITLE_LENGTH,
  validateSessionTitle,
} = require("../src/services/sessionTitles");

test("normalizes a valid session title", () => {
  assert.deepEqual(validateSessionTitle("  Gateway walkthrough  "), {
    title: "Gateway walkthrough",
  });
});

test("rejects an empty session title", () => {
  assert.deepEqual(validateSessionTitle("   "), {
    error: "Session title is required.",
  });
});

test("rejects a session title over the length limit", () => {
  assert.deepEqual(
    validateSessionTitle("a".repeat(MAX_SESSION_TITLE_LENGTH + 1)),
    {
      error: `Session title must be ${MAX_SESSION_TITLE_LENGTH} characters or fewer.`,
    }
  );
});
