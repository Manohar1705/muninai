const express = require("express");
const { listModules } = require("../services/modules");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(listModules());
});

module.exports = router;