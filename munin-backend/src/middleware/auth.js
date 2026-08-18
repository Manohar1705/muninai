const { db } = require("../db");
const { verifyToken } = require("../services/auth");

function extractToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

// Verifies the JWT, loads the current user from the DB (so a deactivated/
// deleted user's old token stops working immediately), and attaches it as
// req.user. By default a user who still has must_reset_password set is
// blocked from every other endpoint — pass { allowPendingReset: true } for
// the handful of routes (GET /me, POST /reset-password) that must remain
// reachable until they've actually reset it.
function requireAuth({ allowPendingReset = false } = {}) {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (user.must_reset_password && !allowPendingReset) {
      return res.status(403).json({ error: "Password reset required", code: "PASSWORD_RESET_REQUIRED" });
    }

    req.user = user;
    next();
  };
}

function requireOwner(req, res, next) {
  if (!req.user?.is_owner) {
    return res.status(403).json({ error: "Only the team owner can perform this action" });
  }
  next();
}

// Loads the engagement named by req.params[paramName], 404s if it doesn't
// exist or belongs to a different team (never leaks cross-team existence),
// and attaches it as req.engagement. Any team member may pass this check —
// it only proves "this engagement is yours", not an admin role.
function requireEngagementAccess(paramName = "id") {
  return async (req, res, next) => {
    const engagementId = req.params[paramName];
    const engagement = await db.prepare(`SELECT * FROM engagements WHERE id = ?`).get(engagementId);
    if (!engagement || engagement.team_id !== req.user.team_id) {
      return res.status(404).json({ error: "Engagement not found" });
    }
    req.engagement = engagement;
    next();
  };
}

// Same as requireEngagementAccess, but additionally requires the caller be
// an admin on this specific engagement (or the team owner, who is always
// admin everywhere in their team).
function requireEngagementAdmin(paramName = "id") {
  const requireAccess = requireEngagementAccess(paramName);
  return (req, res, next) => {
    requireAccess(req, res, async () => {
      if (req.user.is_owner) return next();

      const membership = await db.prepare(`
        SELECT role FROM engagement_members WHERE engagement_id = ? AND user_id = ?
      `).get(req.engagement.id, req.user.id);

      if (membership?.role !== "admin") {
        return res.status(403).json({ error: "Admin role required on this engagement" });
      }
      next();
    });
  };
}

// For routes that carry an engagementId in the query or body (dashboard,
// sessions, meetings, knowledge-objects, coverage, sme-map, chat, modules,
// documents, media) rather than as a route param — verifies it belongs to
// the caller's team whenever one is present. Does not itself require
// engagementId to be present; routes that need it enforce that themselves.
async function requireEngagementIdInTeam(req, res, next) {
  const engagementId = req.query?.engagementId || req.body?.engagementId;
  if (!engagementId) return next();

  const engagement = await db.prepare(`SELECT id, team_id FROM engagements WHERE id = ?`).get(engagementId);
  if (!engagement || engagement.team_id !== req.user.team_id) {
    return res.status(404).json({ error: "Engagement not found" });
  }
  next();
}

// For account-wide (non-engagement-scoped) admin-only pages like LLM
// Insights: allowed if the caller is the team owner, or an admin on at
// least one engagement in their team.
async function requireAnyEngagementAdmin(req, res, next) {
  if (req.user.is_owner) return next();

  const membership = await db.prepare(`
    SELECT 1
    FROM engagement_members em
    JOIN engagements e ON e.id = em.engagement_id
    WHERE em.user_id = ? AND em.role = 'admin' AND e.team_id = ?
    LIMIT 1
  `).get(req.user.id, req.user.team_id);

  if (!membership) {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}

module.exports = {
  requireAuth,
  requireOwner,
  requireEngagementAccess,
  requireEngagementAdmin,
  requireEngagementIdInTeam,
  requireAnyEngagementAdmin,
};
