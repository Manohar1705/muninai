const assert = require("node:assert/strict");
const test = require("node:test");

const {
  UNCLASSIFIED_MODULE,
  normalizeKnownModule,
  selectBestKnownModule,
} = require("../src/services/keywordMatch");

const allowedModules = ["Payments Core", "Customer Notifications"];

test("normalizes an exact allowed module without changing configured casing", () => {
  assert.equal(
    normalizeKnownModule("payments core", allowedModules),
    "Payments Core"
  );
});

test("rejects an invented module even when the model is highly confident", () => {
  assert.equal(
    selectBestKnownModule(
      [{ module: "LLM", moduleConfidence: 0.99 }],
      allowedModules
    ),
    UNCLASSIFIED_MODULE
  );
});

test("keeps weak and missing-confidence matches unclassified", () => {
  assert.equal(
    selectBestKnownModule(
      [{ module: "Payments Core", moduleConfidence: 0.4 }],
      allowedModules
    ),
    UNCLASSIFIED_MODULE
  );
  assert.equal(
    selectBestKnownModule([{ module: "Payments Core" }], allowedModules),
    UNCLASSIFIED_MODULE
  );
});

test("chooses the strongest supported module across extracted objects", () => {
  assert.equal(
    selectBestKnownModule(
      [
        { module: "Payments Core", moduleConfidence: 0.7 },
        { module: "Customer Notifications", moduleConfidence: 0.8 },
        { module: "Customer Notifications", moduleConfidence: 0.75 },
      ],
      allowedModules
    ),
    "Customer Notifications"
  );
});
