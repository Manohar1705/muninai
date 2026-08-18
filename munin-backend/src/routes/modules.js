const express = require("express");
const {
  listModules,
  ensureModule,
  deleteModule,
  updatePlannedSessions,
  renameModule,
} = require("../services/modules");

const router = express.Router();

// GET /api/modules?engagementId=1 — modules for one engagement. engagementId
// is required: returning modules across all engagements would now cross
// team boundaries.
router.get("/", async (req, res) => {
  if (!req.query.engagementId) {
    return res.status(400).json({ error: "engagementId is required" });
  }
  res.json(await listModules(Number(req.query.engagementId)));
});

router.post("/", async (req, res) => {
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

  await ensureModule(name, Number(engagementId));

  res.json({
    success: true,
  });
});

// PATCH /api/modules/:name — updates planned sessions and/or renames the
// module (both scoped to a single engagement). Renaming a module keeps it
// as the source of truth for every session already classified under it.
router.patch("/:name", async (req, res) => {
  try {
    const { plannedSessions, newName, engagementId } = req.body || {};

    if (!engagementId) {
      return res.status(400).json({ error: "engagementId required" });
    }

    let effectiveName = req.params.name;

    if (newName && newName.trim() && newName.trim() !== effectiveName) {
      await renameModule(Number(engagementId), effectiveName, newName.trim());
      effectiveName = newName.trim();
    }

    if (plannedSessions !== undefined) {
      await updatePlannedSessions(
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
router.delete("/:name", async (req, res) => {
  try {
    const engagementId = req.query.engagementId ? Number(req.query.engagementId) : null;
    if (!engagementId) {
      return res.status(400).json({ error: "engagementId required" });
    }
    await deleteModule(engagementId, req.params.name);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;