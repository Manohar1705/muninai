const express = require("express");
const {
  listModules,
  ensureModule,
  deleteModule,
  updatePlannedSessions,
  renameModule,
} = require("../services/modules");

const router = express.Router();

// GET /api/modules?engagementId=1 — modules for one engagement. Omitting
// engagementId returns modules across all engagements (kept for the few
// internal callers, e.g. Ask Munin, that don't have one engagement in scope).
router.get("/", (req, res) => {
  const engagementId = req.query.engagementId ? Number(req.query.engagementId) : undefined;
  res.json(listModules(engagementId));
});

router.post("/", (req, res) => {
  const { name, engagementId } = req.body || {};

  if (!name) {
    return res.status(400).json({
      error: "name required",
    });
  }
  if (!engagementId) {
    return res.status(400).json({
      error: "engagementId required",
    });
  }

  ensureModule(name, Number(engagementId));

  res.json({
    success: true,
  });
});

// PATCH /api/modules/:name — updates planned sessions and/or renames the
// module (both scoped to a single engagement). Renaming a module keeps it
// as the source of truth for every session already classified under it.
router.patch("/:name", (req, res) => {
  try {
    const { plannedSessions, newName, engagementId } = req.body || {};

    if (!engagementId) {
      return res.status(400).json({ error: "engagementId required" });
    }

    let effectiveName = req.params.name;

    if (newName && newName.trim() && newName.trim() !== effectiveName) {
      renameModule(Number(engagementId), effectiveName, newName.trim());
      effectiveName = newName.trim();
    }

    if (plannedSessions !== undefined) {
      updatePlannedSessions(
        Number(engagementId),
        effectiveName,
        Number(plannedSessions || 0)
      );
    }

    res.json({
      success: true,
      name: effectiveName,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
});

// DELETE /api/modules/:name?engagementId=1 — only allowed when nothing has
// been classified under this module yet (see services/modules.js).
router.delete("/:name", (req, res) => {
  try {
    const engagementId = req.query.engagementId ? Number(req.query.engagementId) : null;
    if (!engagementId) {
      return res.status(400).json({ error: "engagementId required" });
    }
    deleteModule(engagementId, req.params.name);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;