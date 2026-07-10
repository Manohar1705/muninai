const express = require("express");

const router = express.Router();

// POST /api/auth/sso — click-through "Sign in with SSO" for enterprise feel.
// No real authentication: single-user demo, always succeeds.
router.post("/sso", (req, res) => {
  const token = process.env.DEMO_SSO_TOKEN || "munin-demo-sso-token";
  res.json({
    token,
    user: { name: "Demo User", email: "demo.user@nova-payments.example" },
  });
});

module.exports = router;
