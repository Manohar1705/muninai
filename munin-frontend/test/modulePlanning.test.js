import assert from "node:assert/strict";
import test from "node:test";

import { getPlanValidationError } from "../src/features/engagement/modulePlanning.js";

test("rejects a plan below completed sessions", () => {
  assert.equal(
    getPlanValidationError("2", 3),
    "Planned sessions cannot be less than completed sessions (3)."
  );
});

test("accepts a plan equal to or above completed sessions", () => {
  assert.equal(getPlanValidationError("3", 3), null);
  assert.equal(getPlanValidationError("4", 3), null);
});

test("rejects blank, negative, and fractional plans", () => {
  assert.equal(
    getPlanValidationError("", 3),
    "Planned sessions is required."
  );
  assert.equal(
    getPlanValidationError("-1", 0),
    "Planned sessions must be a non-negative whole number."
  );
  assert.equal(
    getPlanValidationError("3.5", 3),
    "Planned sessions must be a non-negative whole number."
  );
});
