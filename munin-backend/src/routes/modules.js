const express = require("express");
const {
  listModules,
  ensureModule,
  updatePlannedSessions,
} = require("../services/modules");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(listModules());
});

router.post("/", (req, res) => {
  const { name } = req.body || {};

  if (!name) {
    return res.status(400).json({
      error: "name required",
    });
  }

  ensureModule(name);

  res.json({
    success: true,
  });
});

router.patch("/:name", (req, res) => {
  try {
    const { plannedSessions } = req.body || {};

    updatePlannedSessions(
      req.params.name,
      Number(plannedSessions || 0)
    );

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
});

module.exports = router;