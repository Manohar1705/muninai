/* ============================== API ============================== */
// Base URL for the Munin backend. Override at build time with VITE_API_BASE
// (e.g. VITE_API_BASE=https://api.example.com/api) if not running locally.
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:4000/api";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
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
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = res.status === 204 ? null : await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

// multipart/form-data upload — deliberately doesn't go through apiRequest,
// since that hardcodes a JSON Content-Type header that would break the
// browser's auto-generated multipart boundary.
async function apiUpload(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: formData });
  let data = null;
  try { data = res.status === 204 ? null : await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

// The two meeting endpoints that return a full meeting object disagree on
// casing: POST /join responds camelCase ({ botId, meetingUrl, botName }),
// while GET /:id/status and GET / return the raw snake_case DB row. This
// normalizes either shape into one the UI can rely on.
function normalizeMeeting(m) {
  if (!m) return m;
  return {
    id: m.id,
    botId: m.botId ?? m.bot_id ?? null,
    meetingUrl: m.meetingUrl ?? m.meeting_url ?? "",
    botName: m.botName ?? m.bot_name ?? "Munin",
    meetingTitle: m.meetingTitle ?? m.meeting_title ?? null,
    status: m.status,
    sessionId: m.sessionId ?? m.session_id ?? null,
    module: m.module ?? null,
    warning: m.warning ?? null,
    error: m.error ?? null,
    createdAt: m.createdAt ?? m.created_at ?? null, 
    participants: m.participants
      ? JSON.parse(m.participants)
      : [],
    durationSeconds: m.durationSeconds ?? null,
  };
}

const api = {
  dashboard: () => apiRequest("/dashboard"),
  
  engagements: () => apiRequest("/engagements"),
  modules: () => apiRequest("/modules"),

  createEngagement: (name, phase) =>
    apiRequest("/engagements", {
      method: "POST",
      body: JSON.stringify({ name, phase }),
    }),

  sessions: () => apiRequest("/sessions"),
  session: (id) => apiRequest(`/sessions/${id}`),
  updateSessionModule: (id, module) =>
  apiRequest(`/sessions/${id}/module`, {
    method: "PATCH",
    body: JSON.stringify({ module }),
  }),
  updateMeetingModule: (id, module) =>
  apiRequest(`/meetings/${id}/module`, {
    method: "PATCH",
    body: JSON.stringify({ module }),
  }),
  uploadSession: () => apiRequest("/sessions/upload", { method: "POST" }),
  knowledgeObjects: () => apiRequest("/knowledge-objects"),
  coverage: () => apiRequest("/coverage"),
  smeMap: () => apiRequest("/sme-map"),
  listConversations: () => apiRequest("/chat/conversations"),
  newConversation: () => apiRequest("/chat/conversations", { method: "POST" }),
  renameConversation: (id, title) => apiRequest(`/chat/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  pinConversation: (id, pinned) => apiRequest(`/chat/conversations/${id}/pin`, { method: "PATCH", body: JSON.stringify({ pinned }) }),
  archiveConversation: (id, archived) => apiRequest(`/chat/conversations/${id}/archive`, { method: "PATCH", body: JSON.stringify({ archived }) }),
  deleteConversation: (id) => apiRequest(`/chat/conversations/${id}`, { method: "DELETE" }),
  chatHistory: (conversationId) => apiRequest(`/chat/history?conversationId=${encodeURIComponent(conversationId || "")}`),
  chat: (message, conversationId) => apiRequest("/chat", { method: "POST", body: JSON.stringify({ message, conversationId }) }),

  patchGap: (id, status) => apiRequest(`/coverage/gaps/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  resetDemo: () => apiRequest("/settings/reset", { method: "POST" }),
  settingsStatus: () => apiRequest("/settings/status"),
  uploadDocument: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload("/documents/upload", fd);
  },
  uploadMedia: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload("/media/upload", fd);
  },
  meetings: () => apiRequest("/meetings"),
  joinMeeting: (meetingUrl, botName, meetingTitle) => apiRequestSoft("/meetings/join", { method: "POST", body: JSON.stringify({ meetingUrl, botName, meetingTitle }) }),
  meetingStatus: (id) => apiRequestSoft(`/meetings/${id}/status`),
  leaveMeeting: (id) => apiRequestSoft(`/meetings/${id}/leave`, { method: "POST" }),
};
export {
  API_BASE,
  apiRequest,
  apiRequestSoft,
  apiUpload,
  normalizeMeeting,
  api,
};