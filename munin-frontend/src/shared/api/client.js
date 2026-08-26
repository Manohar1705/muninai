/* ============================== API ============================== */
// Base URL for the Munin backend. Override at build time with VITE_API_BASE
// (e.g. VITE_API_BASE=https://api.example.com/api) if not running locally.
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:4000/api";

// Single source of truth for where the JWT lives — AuthContext reads/writes
// through these helpers too, rather than touching localStorage directly, so
// there's exactly one key name and one storage mechanism to change later.
const TOKEN_STORAGE_KEY = "munin.token";

function getToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}
function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}
function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401) {
    // Missing/invalid/expired token — no local recovery is possible, so
    // clear it and let AuthContext drop the whole app back to the login
    // screen instead of every caller having to special-case this.
    setToken(null);
    window.dispatchEvent(new Event("munin:auth:unauthorized"));
  }
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch { /* ignore */ }
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return res.status === 204 ? null : res.json();
}

// Like apiRequest, but never throws on a non-2xx — some endpoints (document
// upload, meeting join/status/leave) return a meaningful body even on error
// (e.g. { error, extractedText } or { error, meeting: { status: "error" } })
// that the caller needs, not just a message.
async function apiRequestSoft(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("munin:auth:unauthorized"));
  }
  let data = null;
  try { data = res.status === 204 ? null : await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

// multipart/form-data upload — deliberately doesn't go through apiRequest,
// since that hardcodes a JSON Content-Type header that would break the
// browser's auto-generated multipart boundary.
async function apiUpload(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: formData, headers: authHeader() });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("munin:auth:unauthorized"));
  }
  let data = null;
  try { data = res.status === 204 ? null : await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

// The two meeting endpoints that return a full meeting object disagree on
// casing: POST /join responds camelCase ({ botId, meetingUrl, botName }),
// while GET /:id/status and GET / return the raw snake_case DB row. This
// normalizes either shape into one the UI can rely on.


const api = {
  patchGap: (id, status) => apiRequest(`/coverage/gaps/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  resetDemo: () => apiRequest("/settings/reset", { method: "POST" }),
  settingsStatus: () => apiRequest("/settings/status"),
};

// Every query key below is derived (directly or indirectly) from the
// modules table and/or the engagements table: module/session/meeting
// classification, planned-session counts, and engagement metadata all feed
// into the Dashboard, SME map, Sessions/Meetings module dropdowns, and the
// Starter page's per-engagement stats. Call this after ANY mutation that
// can change module definitions, module<->session/meeting classification,
// or engagement metadata, so every screen reflects it without requiring a
// manual page refresh.
function invalidateEngagementScopedQueries(queryClient, engagementId) {
  queryClient.invalidateQueries({ queryKey: ["engagements"] });
  queryClient.invalidateQueries({ queryKey: ["modules", engagementId] });
  queryClient.invalidateQueries({ queryKey: ["dashboard", engagementId] });
  queryClient.invalidateQueries({ queryKey: ["sme-map", engagementId] });
  queryClient.invalidateQueries({ queryKey: ["sessions", engagementId] });
  queryClient.invalidateQueries({ queryKey: ["meetings", engagementId] });
}

export {
  API_BASE,
  apiRequest,
  apiRequestSoft,
  apiUpload,
  invalidateEngagementScopedQueries,
  api,
  getToken,
  setToken,
};