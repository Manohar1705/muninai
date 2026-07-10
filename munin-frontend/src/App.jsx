import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ============================== DESIGN TOKENS ============================== */
const C = {
  bg: "#0D0E11",
  bgRaised: "#131418",
  bgCard: "#16171C",
  border: "rgba(245,243,238,0.09)",
  borderStrong: "rgba(245,243,238,0.16)",
  text: "#F5F3EE",
  textMuted: "#8B8F98",
  textFaint: "#5B5E66",
  amber: "#D9A441",
  amberSoft: "rgba(217,164,65,0.14)",
  amberSofter: "rgba(217,164,65,0.08)",
  red: "#C4685A",
  redSoft: "rgba(196,104,90,0.14)",
  green: "#7FA37A",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');`;
const FF = { sans: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif", mono: "'IBM Plex Mono', ui-monospace, monospace" };

/* ============================== ICONS (inline, no deps) ============================== */
const Icon = ({ d, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
const IconRaven = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 100 100" fill="currentColor" {...p}>
    <path d="M50 8c-3 0-5 2-7 5-8-2-16 1-20 8-2-1-5 0-6 3-1 2 0 4 2 5-3 3-4 8-2 12 1 2 3 3 5 3-1 4 1 8 4 10-3 4-2 9 2 12 5 4 12 4 17 1 2 4 6 6 10 6 5 0 9-3 11-7 5 2 11 0 14-4 3 3 8 4 12 2 4-2 6-7 5-11 3 0 6-2 7-5 1-4-1-8-4-10 2-4 1-9-2-12-1-4-5-6-9-6 0-4-2-7-5-9-1-4-4-7-8-8-1-3-4-5-8-5-2-4-6-6-11-6-4 0-8 2-10 5-2-1-5-1-7 1z"/>
    <circle cx="38" cy="42" r="2.4" fill="#0D0E11"/>
  </svg>
);
const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
  sessions: <><path d="M3 6h18M3 12h18M3 18h12"/></>,
  kb: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M4 19.5V6.5"/></>,
  coverage: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  sme: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5"/><circle cx="18" cy="7" r="2.6"/><path d="M15.5 13.5c2.8.2 5 2.4 5.5 6.5"/></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.7.2 1.51.7 1.51 1.51V12z"/></>,
  upload: <><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  x: <><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  check: <path d="M20 6 9 17l-5-5"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></>,
  play: <path d="M6 4l12 8-12 8V4z"/>,
  arrowRight: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  link: <><path d="M9 17H7a5 5 0 0 1 0-10h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/></>,
  refresh: <><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></>,
  video: <><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3.5v11L16 14"/></>,
  logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></>,
  send: <path d="M22 2 11 13"/>,
};

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
    status: m.status,
    sessionId: m.sessionId ?? m.session_id ?? null,
    error: m.error ?? null,
  };
}

const api = {
  dashboard: () => apiRequest("/dashboard"),
  sessions: () => apiRequest("/sessions"),
  session: (id) => apiRequest(`/sessions/${id}`),
  uploadSession: () => apiRequest("/sessions/upload", { method: "POST" }),
  knowledgeObjects: () => apiRequest("/knowledge-objects"),
  coverage: () => apiRequest("/coverage"),
  smeMap: () => apiRequest("/sme-map"),
  chatHistory: () => apiRequest("/chat/history"),
  chat: (message) => apiRequest("/chat", { method: "POST", body: JSON.stringify({ message }) }),
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
  joinMeeting: (meetingUrl, botName) => apiRequestSoft("/meetings/join", { method: "POST", body: JSON.stringify({ meetingUrl, botName }) }),
  meetingStatus: (id) => apiRequestSoft(`/meetings/${id}/status`),
  leaveMeeting: (id) => apiRequestSoft(`/meetings/${id}/leave`, { method: "POST" }),
};

/* ============================== STATIC CONFIG ============================== */
// Presentation-only reference data not owned by the backend (module list
// mirrors the backend's fixed MODULES constant; SME role labels are display
// metadata for the Sessions attendee line).
const MODULES = ["Payments Core", "Batch & Settlement", "Channel APIs", "Fraud Screening", "Reporting & Recon", "Customer Notifications"];

const SME = {
  "Rajesh Iyer": "Incumbent SME, Payments Core",
  "Priya Nair": "Incumbent SME, Payments Core",
  "Marcus Weber": "Incumbent SME, Batch & Settlement",
  "Ines Almeida": "Incumbent SME, Fraud Screening",
  "Daniel Kowalski": "Incumbent SME, Reporting & Recon",
  "Sofia Conti": "Incumbent SME, Customer Notifications",
  "Tom Okafor": "Incoming Engineer",
  "Lena Fischer": "Incoming Engineer",
  "Yusuf Demir": "Incoming Engineer",
};


const PHASES = ["Discovery", "KT", "Shadow", "Reverse Shadow", "Cutover", "Steady State"];

/* ============================== SHARED UI ============================== */
function TypeBadge({ type }) {
  return (
    <span style={{ fontFamily: FF.mono, fontSize: 11, letterSpacing: 0.3, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>{type}</span>
  );
}
function ConfidenceBadge({ v }) {
  const low = v < 0.7;
  return (
    <span style={{
      fontFamily: FF.mono, fontSize: 11, borderRadius: 4, padding: "2px 7px",
      color: low ? C.red : C.amber, background: low ? C.redSoft : C.amberSofter, border: `1px solid ${low ? "rgba(196,104,90,0.3)" : "rgba(217,164,65,0.3)"}`,
    }}>{low ? "Needs review · " : ""}{Math.round(v * 100)}%</span>
  );
}
function Pill({ children, tone = "default" }) {
  const tones = {
    default: { color: C.textMuted, bg: "transparent", border: C.border },
    amber: { color: C.amber, bg: C.amberSofter, border: "rgba(217,164,65,0.3)" },
    open: { color: "#D9A441", bg: C.amberSofter, border: "rgba(217,164,65,0.3)" },
    scheduled: { color: "#8FB4D9", bg: "rgba(143,180,217,0.1)", border: "rgba(143,180,217,0.3)" },
    closed: { color: C.green, bg: "rgba(127,163,122,0.1)", border: "rgba(127,163,122,0.3)" },
    error: { color: C.red, bg: C.redSoft, border: "rgba(196,104,90,0.3)" },
  };
  const t = tones[tone] || tones.default;
  return <span style={{ fontSize: 11.5, fontWeight: 500, color: t.color, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>{children}</span>;
}
function Section({ title, action, children, style }) {
  return (
    <div style={{ ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          {title && <h2 style={{ fontSize: 15, fontWeight: 500, letterSpacing: 0.2, color: C.text, margin: 0 }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
function Card({ children, style, ...rest }) {
  return <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, ...style }} {...rest}>{children}</div>;
}

/* ============================== SIDEBAR ============================== */
function Sidebar({ page, setPage, openGapsCount, onResetDemo, resetting }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: icons.dashboard },
    { id: "sessions", label: "Sessions", icon: icons.sessions },
    { id: "meetings", label: "Meetings", icon: icons.video },
    { id: "kb", label: "Knowledge base", icon: icons.kb },
    { id: "coverage", label: "Coverage", icon: icons.coverage, badge: openGapsCount },
    { id: "sme", label: "SME map", icon: icons.sme },
    { id: "chat", label: "Ask Munin", icon: icons.chat },
  ];
  return (
    <div style={{ width: 236, flexShrink: 0, background: C.bgRaised, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "22px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 30 }}>
        <div style={{ color: C.amber }}><IconRaven size={22} /></div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: 0.2 }}>Munin</div>
          <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: -1 }}>The agent that remembers everything</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const active = page === it.id;
          return (
            <button key={it.id} onClick={() => setPage(it.id)} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 7,
              background: active ? C.amberSofter : "transparent", border: "none", cursor: "pointer",
              color: active ? C.amber : C.textMuted, fontFamily: FF.sans, fontSize: 13.5, fontWeight: active ? 500 : 400,
              textAlign: "left", width: "100%",
            }}>
              <Icon d={it.icon} size={16} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {!!it.badge && <span style={{ fontFamily: FF.mono, fontSize: 10.5, color: C.amber, background: C.amberSofter, borderRadius: 20, padding: "1px 6px" }}>{it.badge}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={onResetDemo}
          disabled={resetting}
          title="Wipes all changes and re-seeds the initial demo state"
          style={{
            display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", width: "100%", textAlign: "left",
            color: C.textFaint, fontSize: 12.5, background: "transparent", border: "none", cursor: resetting ? "default" : "pointer", fontFamily: FF.sans,
          }}
        >
          <Icon d={icons.refresh} size={15} />
          <span>{resetting ? "Resetting…" : "Reset demo data"}</span>
        </button>
      </div>
    </div>
  );
}

/* ============================== ENGAGEMENT HEADER ============================== */
function PhaseTracker({ current }) {
  const idx = PHASES.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i < idx ? C.amber : i === idx ? C.amber : C.textFaint,
              opacity: i <= idx ? 1 : 0.4,
            }} />
            <span style={{ fontSize: 12, color: i === idx ? C.amber : C.textFaint, fontWeight: i === idx ? 500 : 400 }}>{p}</span>
          </div>
          {i < PHASES.length - 1 && <div style={{ width: 20, height: 1, background: C.border, margin: "0 8px" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}
function EngagementHeader() {
  return (
    <div style={{ padding: "22px 32px 18px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textFaint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>Engagement</div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Nova Payments Platform — Transition to New Vendor</h1>
        </div>
        <PhaseTracker current="Reverse Shadow" />
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */
function StatCard({ label, value, sub }) {
  return (
    <Card style={{ padding: "16px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: C.text, fontFamily: FF.mono }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}
function ReadinessChart({ readiness }) {
  const data = MODULES.map((m) => ({ module: m, value: readiness[m] })).sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FF.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
        <YAxis type="category" dataKey="module" width={140} tick={{ fill: C.textMuted, fontSize: 12.5, fontFamily: FF.sans }} axisLine={{ stroke: C.border }} tickLine={false} />
        <Tooltip contentStyle={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: FF.sans, fontSize: 12 }} labelStyle={{ color: C.text }} itemStyle={{ color: C.amber }} cursor={{ fill: "rgba(245,243,238,0.03)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((d, i) => <Cell key={i} fill={C.amber} fillOpacity={0.35 + (d.value / 100) * 0.65} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
function Dashboard({ stats, readiness, activity, setPage }) {
  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Sessions processed" value={stats.sessionsProcessed} sub={`${stats.transcriptSegments} transcript segments`} />
        <StatCard label="Knowledge objects" value={stats.knowledgeObjects} sub={`${stats.needsReview} flagged for review`} />
        <StatCard label="Open gaps" value={stats.openGaps} sub={`${stats.totalGaps} total logged`} />
        <StatCard label="Overall readiness" value={`${stats.overallReadiness}%`} sub="Blended across 6 modules" />
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Card style={{ padding: "20px 22px", flex: "2 1 480px" }}>
          <Section title="Readiness by module">
            <ReadinessChart readiness={readiness} />
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px", flex: "1 1 300px" }}>
          <Section title="Recent activity">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber, marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2, fontFamily: FF.mono }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </Card>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button onClick={() => setPage("sessions")} style={btnPrimary}>Go to sessions <Icon d={icons.arrowRight} size={14} /></button>
        <button onClick={() => setPage("coverage")} style={btnGhost}>Review open gaps</button>
      </div>
    </div>
  );
}

const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 7, background: C.amber, color: "#1A1408",
  border: "none", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FF.sans,
};
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", color: C.text,
  border: `1px solid ${C.borderStrong}`, borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FF.sans,
};

/* ============================== SESSIONS ============================== */
function SessionRow({ s, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left",
      background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "14px 4px", cursor: "pointer", fontFamily: FF.sans,
    }}>
      <div style={{ fontFamily: FF.mono, fontSize: 12, color: C.textFaint, width: 26 }}>{String(s.num).padStart(2, "0")}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: C.text, marginBottom: 3 }}>{s.title}</div>
        <div style={{ fontSize: 12, color: C.textFaint }}>{s.date} · {s.duration} · {s.attendees.join(", ")}</div>
      </div>
      <Pill tone="amber">{s.module}</Pill>
      {s.status === "In Progress" ? (
        <span style={{ fontSize: 11.5, color: C.amber, display: "flex", alignItems: "center", gap: 5 }}><Icon d={icons.refresh} size={12} /> In progress</span>
      ) : (
        <span style={{ fontSize: 11.5, color: C.green, display: "flex", alignItems: "center", gap: 5 }}><Icon d={icons.check} size={12} /> Processed</span>
      )}
      <Icon d={icons.chevronRight} size={16} color={C.textFaint} />
    </button>
  );
}

function UploadFlow({ onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const steps = ["Transcribing", "Extracting", "Indexing"];
  useEffect(() => {
    if (step >= steps.length) { const t = setTimeout(onComplete, 700); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((s) => s + 1), 2000);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(6,6,8,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <Card style={{ width: 420, padding: "32px 30px", textAlign: "center" }}>
        <div style={{ color: C.amber, marginBottom: 18, display: "flex", justifyContent: "center" }}><IconRaven size={30} /></div>
        <div style={{ fontSize: 14.5, color: C.text, marginBottom: 4 }}>Processing session recording</div>
        <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 26, fontFamily: FF.mono }}>notification-gateway-failover-dr.mp4</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map((label, i) => {
            const done = i < step, active = i === step;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i > step ? 0.35 : 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${done ? C.amber : active ? C.amber : C.border}`, background: done ? C.amber : "transparent",
                }}>
                  {done ? <Icon d={icons.check} size={11} color="#1A1408" /> : active ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber, animation: "muninPulse 1s infinite" }} /> : null}
                </div>
                <span style={{ fontSize: 13, color: done || active ? C.text : C.textFaint, textAlign: "left" }}>{label}{active ? "…" : ""}</span>
              </div>
            );
          })}
        </div>
        <style>{`@keyframes muninPulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      </Card>
    </div>
  );
}

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(6,6,8,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };

function UploadModal({ onClose, onDemoComplete, onRealUploadComplete }) {
  const [mode, setMode] = useState("choose"); // choose | demo | uploading-document | uploading-media | error
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const documentInputRef = useRef(null);
  const mediaInputRef = useRef(null);

  const optionCardStyle = {
    textAlign: "left", padding: "14px 16px", background: C.bgRaised, border: `1px solid ${C.border}`,
    borderRadius: 8, cursor: "pointer", fontFamily: FF.sans, width: "100%",
  };

  // Two genuinely separate upload paths, not one endpoint that branches on
  // file type — documents go straight to text extraction, recordings need
  // a speech-to-text pass first (Groq Whisper) before extraction can run.
  const handleDocumentFile = async (f) => {
    setFile(f);
    setError(null);
    setMode("uploading-document");
    const res = await api.uploadDocument(f);
    if (res.ok) onRealUploadComplete(res.data);
    else { setError(res.data?.error || `Upload failed (${res.status}).`); setMode("error"); }
  };

  const handleMediaFile = async (f) => {
    setFile(f);
    setError(null);
    setMode("uploading-media");
    const res = await api.uploadMedia(f);
    if (res.ok) onRealUploadComplete(res.data);
    else { setError(res.data?.error || `Upload failed (${res.status}).`); setMode("error"); }
  };

  if (mode === "demo") {
    return <UploadFlow onClose={onClose} onComplete={onDemoComplete} />;
  }

  return (
    <div style={overlayStyle}>
      <Card style={{ width: 460, padding: "26px 26px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Upload session recording</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 2 }}><Icon d={icons.x} size={16} /></button>
        </div>

        {mode === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setMode("demo")} style={optionCardStyle}>
              <div style={{ fontSize: 13.5, color: C.text, marginBottom: 3 }}>Use sample recording</div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>Runs the demo pipeline against a canned KT recording — good for a quick walkthrough.</div>
            </button>
            <button onClick={() => documentInputRef.current?.click()} style={optionCardStyle}>
              <div style={{ fontSize: 13.5, color: C.text, marginBottom: 3 }}>Upload a document</div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>.txt, .md, .pdf or .docx — text is extracted and run through real knowledge extraction.</div>
            </button>
            <button onClick={() => mediaInputRef.current?.click()} style={optionCardStyle}>
              <div style={{ fontSize: 13.5, color: C.text, marginBottom: 3 }}>Upload a recording</div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>.mp4, .mp3, .wav, .m4a or .webm (max 25MB) — real speech-to-text (Groq Whisper), then the same extraction pipeline.</div>
            </button>
            <input
              ref={documentInputRef} type="file" accept=".txt,.md,.pdf,.docx" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocumentFile(f); }}
            />
            <input
              ref={mediaInputRef} type="file" accept=".mp4,.mp3,.mpeg,.mpga,.m4a,.wav,.webm" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaFile(f); }}
            />
          </div>
        )}

        {mode === "uploading-document" && (
          <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
            <div style={{ color: C.amber, marginBottom: 14, display: "flex", justifyContent: "center" }}><IconRaven size={26} /></div>
            <div style={{ fontSize: 13.5, color: C.text, marginBottom: 4 }}>Extracting knowledge from {file?.name}…</div>
            <div style={{ fontSize: 12, color: C.textFaint }}>Running the real extraction pipeline — this can take a few seconds.</div>
          </div>
        )}

        {mode === "uploading-media" && (
          <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
            <div style={{ color: C.amber, marginBottom: 14, display: "flex", justifyContent: "center" }}><IconRaven size={26} /></div>
            <div style={{ fontSize: 13.5, color: C.text, marginBottom: 4 }}>Transcribing {file?.name}…</div>
            <div style={{ fontSize: 12, color: C.textFaint }}>Speech-to-text first, then knowledge extraction — larger files can take a little longer.</div>
          </div>
        )}

        {mode === "error" && (
          <div>
            <div style={{ padding: "12px 14px", background: C.redSoft, border: "1px solid rgba(196,104,90,0.3)", borderRadius: 8, fontSize: 12.5, color: C.red, marginBottom: 16, lineHeight: 1.5 }}>{error}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setMode("choose")} style={btnGhost}>Try again</button>
              <button onClick={onClose} style={btnGhost}>Close</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Sessions({ sessions, onUploadComplete, onRealUpload, jumpTarget, clearJumpTarget }) {
  const [selected, setSelected] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState(null);

  const openSession = async (id, segTimeToScrollTo) => {
    setLoadingSelected(true);
    try {
      const full = await api.session(id);
      setSelected(full);
      if (segTimeToScrollTo) {
        setTimeout(() => {
          document.getElementById(`seg-${id}-${segTimeToScrollTo}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }
    } catch (err) {
      console.error(err);
      alert("Couldn't load that session — is the backend running?");
    } finally {
      setLoadingSelected(false);
    }
  };

  useEffect(() => {
    if (jumpTarget) {
      openSession(jumpTarget.sessionId, jumpTarget.segTime);
      clearJumpTarget();
    }
  }, [jumpTarget]);

  if (loadingSelected) {
    return <div style={{ padding: "26px 32px 48px", color: C.textFaint, fontSize: 13 }}>Loading session…</div>;
  }

  if (selected) {
    const kos = selected.knowledgeObjects || [];
    return (
      <div style={{ padding: "26px 32px 48px" }}>
        <button onClick={() => setSelected(null)} style={{ ...btnGhost, marginBottom: 18, padding: "6px 12px" }}>← Back to sessions</button>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Session {String(selected.num).padStart(2, "0")} · {selected.module}</div>
          <h1 style={{ fontSize: 19, fontWeight: 500, margin: "0 0 6px" }}>{selected.title}</h1>
          <div style={{ fontSize: 12.5, color: C.textFaint }}>{selected.date} · {selected.duration} · {selected.attendees.map((a) => `${a} — ${SME[a] || ""}`).join(" · ")}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Card style={{ flex: 1.3, padding: "18px 20px", maxHeight: 640, overflowY: "auto" }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.4 }}>Transcript</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {selected.transcript.map((seg, i) => (
                <div key={i} id={`seg-${selected.id}-${seg.t}`}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontFamily: FF.mono, fontSize: 11, color: C.amber }}>{seg.t}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: C.text }}>{seg.s}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.6 }}>{seg.x}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ flex: 1, padding: "18px 20px", maxHeight: 640, overflowY: "auto" }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.4 }}>Extracted knowledge ({kos.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {kos.map((k) => (
                <div key={k.id} style={{ padding: "12px 13px", background: C.bgRaised, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{k.title}</span>
                    <TypeBadge type={k.type} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{k.description}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: FF.mono, fontSize: 10.5, color: C.textFaint }}>{k.source.split(", ").pop()}</span>
                    <ConfidenceBadge v={k.confidence} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title={`KT sessions (${sessions.length})`} action={
        <button onClick={() => setUploading(true)} style={btnPrimary}><Icon d={icons.upload} size={14} /> Upload session recording</button>
      }>
        <Card style={{ padding: "4px 18px" }}>
          {sessions.map((s) => <SessionRow key={s.id} s={s} onClick={() => openSession(s.id)} />)}
        </Card>
      </Section>
      {flash && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: C.amberSofter, border: `1px solid rgba(217,164,65,0.3)`, borderRadius: 8, fontSize: 13, color: C.amber, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={icons.check} size={15} /> {flash}
        </div>
      )}
      {uploading && (
        <UploadModal
          onClose={() => setUploading(false)}
          onDemoComplete={async () => {
            setUploading(false);
            const alreadyUploaded = await onUploadComplete();
            if (!alreadyUploaded) {
              setFlash("Session 9 added — 4 new knowledge objects indexed, coverage and readiness updated.");
              setTimeout(() => setFlash(null), 6000);
            }
          }}
          onRealUploadComplete={async (data) => {
            setUploading(false);
            await onRealUpload(data);
            setFlash(`"${data.session.title}" processed — ${data.knowledgeObjects.length} knowledge object(s) indexed.`);
            setTimeout(() => setFlash(null), 6000);
          }}
        />
      )}
    </div>
  );
}

/* ============================== KNOWLEDGE BASE ============================== */
function KnowledgeBase({ knowledgeObjects, goToTranscript }) {
  const [q, setQ] = useState("");
  const [module, setModule] = useState("All");
  const [type, setType] = useState("All");
  const [open, setOpen] = useState(null);
  const types = ["Runbook", "Failure Mode", "Dependency", "Interface", "Batch Job", "Tribal Knowledge"];

  const filtered = useMemo(() => knowledgeObjects.filter((k) => {
    const matchesQ = !q || k.title.toLowerCase().includes(q.toLowerCase()) || k.description.toLowerCase().includes(q.toLowerCase());
    const matchesM = module === "All" || k.module === module;
    const matchesT = type === "All" || k.type === type;
    return matchesQ && matchesM && matchesT;
  }), [q, module, type, knowledgeObjects]);

  const selectStyle = { background: C.bgRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "8px 10px", fontSize: 13, fontFamily: FF.sans };

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title={`Knowledge base (${filtered.length} of ${knowledgeObjects.length})`}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <span style={{ position: "absolute", left: 10, top: 9, color: C.textFaint }}><Icon d={icons.search} size={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search knowledge objects…" style={{ ...selectStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)} style={selectStyle}>
            <option>All</option>{MODULES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            <option>All</option>{types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((k) => (
            <Card key={k.id} onClick={() => setOpen(k)} style={{ padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <TypeBadge type={k.type} />
                <ConfidenceBadge v={k.confidence} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{k.title}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{k.description}</div>
              <Pill>{k.module}</Pill>
            </Card>
          ))}
        </div>
      </Section>

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(6,6,8,0.6)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 420, height: "100%", background: C.bgRaised, borderLeft: `1px solid ${C.border}`, padding: "26px 26px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <TypeBadge type={open.type} />
              <button onClick={() => setOpen(null)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer" }}><Icon d={icons.x} size={18} /></button>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 10px" }}>{open.title}</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <Pill tone="amber">{open.module}</Pill>
              <ConfidenceBadge v={open.confidence} />
            </div>
            <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.7, marginBottom: 22 }}>{open.description}</div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Source citation</div>
              <div style={{ fontFamily: FF.mono, fontSize: 12.5, color: C.text, marginBottom: 14 }}>{open.source}</div>
              <button onClick={() => { goToTranscript(open); setOpen(null); }} style={{ ...btnGhost, width: "100%", justifyContent: "center" }}>
                <Icon d={icons.link} size={14} /> View in transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== COVERAGE ============================== */
function Coverage({ topics, gaps }) {
  const depthColor = (d) => ["#1E2027", "rgba(217,164,65,0.28)", "rgba(217,164,65,0.58)", C.amber][d];
  const suggested = useMemo(() => {
    const uncovered = topics.filter((t) => t.depth <= 1).slice(0, 4);
    const openGaps = gaps.filter((g) => g.status !== "Closed").slice(0, 3);
    return { uncovered, openGaps };
  }, [topics, gaps]);
  const tones = { Open: "open", "Scheduled for next session": "scheduled", Closed: "closed" };

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Card style={{ padding: "20px 22px", flex: "2 1 520px", overflowX: "auto" }}>
          <Section title="Coverage matrix">
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {MODULES.map((m) => (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 150, fontSize: 12.5, color: C.textMuted, flexShrink: 0 }}>{m}</div>
                  <div style={{ display: "flex", gap: 4, flex: 1 }}>
                    {topics.filter((t) => t.module === m).map((t, i) => (
                      <div key={i} title={`${t.topic} — depth ${t.depth}`} style={{ flex: 1, height: 34, borderRadius: 4, background: depthColor(t.depth), display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10.5, fontFamily: FF.mono, color: t.depth >= 2 ? "#1A1408" : C.textFaint }}>{t.depth}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, fontSize: 11, color: C.textFaint }}>
              <span>Coverage depth</span>
              {[0, 1, 2, 3].map((d) => (
                <span key={d} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: depthColor(d), display: "inline-block" }} />{d}
                </span>
              ))}
            </div>
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px", flex: "1 1 300px" }}>
          <Section title="Suggested agenda for next session">
            <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Uncovered topics</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {suggested.uncovered.map((t, i) => (
                <div key={i} style={{ fontSize: 13, color: C.text, display: "flex", justifyContent: "space-between" }}>
                  <span>{t.topic}</span><span style={{ color: C.textFaint }}>{t.module}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Top open questions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggested.openGaps.map((g) => (
                <div key={g.id} style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.4 }}>{g.question}</div>
              ))}
            </div>
          </Section>
        </Card>
      </div>

      <Card style={{ padding: "20px 22px", marginTop: 24 }}>
        <Section title={`Open questions & gaps (${gaps.length})`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {gaps.map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 4px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, fontSize: 13.5, color: C.text }}>{g.question}</div>
                <Pill>{g.module}</Pill>
                <Pill tone={tones[g.status]}>{g.status}</Pill>
              </div>
            ))}
          </div>
        </Section>
      </Card>
    </div>
  );
}

/* ============================== SME MAP ============================== */
function SMEMap({ sme, keyPersonRisk }) {
  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title="SME contribution map">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {MODULES.map((m) => {
            const people = sme[m] || [];
            const risky = keyPersonRisk.has(m);
            return (
              <Card key={m} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: C.text }}>{m}</div>
                  {risky && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.red, background: C.redSoft, border: "1px solid rgba(196,104,90,0.3)", borderRadius: 20, padding: "3px 9px" }}>
                      <Icon d={icons.alert} size={12} /> Key-person risk
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {people.map((p) => (
                    <div key={p.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: C.text }}>{p.name}</span>
                        <span style={{ color: C.textFaint, fontFamily: FF.mono }}>{p.share}%</span>
                      </div>
                      <div style={{ height: 5, background: "#1E2027", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${p.share}%`, height: "100%", background: p.share > 70 ? C.red : C.amber }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ============================== ASK MUNIN (CHAT) ============================== */
function AskMunin({ onGapLogged }) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    api.chatHistory()
      .then((history) => setMessages(history.map((m) => ({ role: m.role, text: m.text, citation: m.citation, isGap: m.isGap }))))
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  }, []);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const res = await api.chat(q);
      setMessages((m) => [...m, { role: "assistant", text: res.reply, citation: res.citation, isGap: res.isGap }]);
      if (res.isGap) onGapLogged();
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", text: "Sorry — I couldn't reach the backend to answer that. Is it running?", citation: null, isGap: false }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: "26px 32px 32px", display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <Section title="Ask Munin" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: C.textFaint }}>Answers are grounded in the knowledge base and always cite a source. Anything uncovered is logged as a gap automatically.</div>
      </Section>
      <Card style={{ flex: 1, padding: "18px 20px", overflowY: "auto", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingHistory && <div style={{ fontSize: 12.5, color: C.textFaint }}>Loading conversation…</div>}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: 520, padding: "10px 14px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.55,
                background: m.role === "user" ? C.amberSofter : C.bgRaised,
                border: `1px solid ${m.role === "user" ? "rgba(217,164,65,0.25)" : C.border}`,
                color: C.text,
              }}>
                <div>{m.text}</div>
                {m.citation && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontFamily: FF.mono, fontSize: 11, color: C.amber, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={icons.book} size={12} /> {m.citation}
                  </div>
                )}
                {m.isGap && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textFaint, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={icons.alert} size={12} color={C.red} /> Added to Coverage → Open questions
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </Card>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about a runbook, dependency, or failure mode…"
          disabled={sending}
          style={{ flex: 1, background: C.bgRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "12px 14px", fontSize: 13.5, fontFamily: FF.sans }}
        />
        <button onClick={send} disabled={sending} style={{ ...btnPrimary, opacity: sending ? 0.6 : 1 }}><Icon d={icons.send} size={14} /> {sending ? "Sending…" : "Send"}</button>
      </div>
    </div>
  );
}

/* ============================== MEETINGS ============================== */
const MEETING_TERMINAL = new Set(["call_ended", "done", "error", "fatal"]);

function meetingStatusMeta(status) {
  const map = {
    joining: { label: "Joining…", tone: "scheduled" },
    joining_call: { label: "Joining…", tone: "scheduled" },
    in_waiting_room: { label: "In waiting room", tone: "scheduled" },
    in_call_not_recording: { label: "In call", tone: "open" },
    in_call_recording: { label: "Recording", tone: "open" },
    in_call: { label: "In call", tone: "open" },
    call_ended: { label: "Call ended", tone: "closed" },
    done: { label: "Processed", tone: "closed" },
    error: { label: "Error", tone: "error" },
    fatal: { label: "Error", tone: "error" },
  };
  return map[status] || { label: status || "Unknown", tone: "default" };
}

function Meetings({ meetings, setMeetings, refreshAfterProcessing, goToSession, configStatus }) {
  const [url, setUrl] = useState("");
  const [botName, setBotName] = useState("Munin");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const pollTimers = useRef({});

  const inputStyle = { background: C.bgRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "8px 10px", fontSize: 13, fontFamily: FF.sans, width: "100%", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 11.5, color: C.textFaint, marginBottom: 5 };

  const schedulePoll = (id, delay = 4000) => {
    clearTimeout(pollTimers.current[id]);
    pollTimers.current[id] = setTimeout(() => pollMeeting(id), delay);
  };

  const pollMeeting = async (id) => {
    const res = await api.meetingStatus(id);
    if (res.ok && res.data?.meeting) {
      const merged = normalizeMeeting(res.data.meeting);
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...merged, warning: res.data.warning || null } : m)));
      if (merged.sessionId) refreshAfterProcessing();
      if (!MEETING_TERMINAL.has(merged.status)) schedulePoll(id);
    } else {
      // Transient polling failure (backend hiccup, etc) — keep last-known
      // state on screen and just try again shortly rather than erroring out.
      schedulePoll(id, 6000);
    }
  };

  useEffect(() => {
    meetings.forEach((m) => {
      if (!MEETING_TERMINAL.has(m.status) && !pollTimers.current[m.id]) schedulePoll(m.id, 3000);
    });
    return () => { Object.values(pollTimers.current).forEach(clearTimeout); pollTimers.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!url.trim() || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await api.joinMeeting(url.trim(), botName.trim() || "Munin");
      const meeting = res.data?.meeting ? normalizeMeeting(res.data.meeting) : null;
      if (meeting) {
        setMeetings((prev) => [meeting, ...prev]);
        if (res.ok) { setUrl(""); schedulePoll(meeting.id, 3000); }
      }
      if (!res.ok) setJoinError(res.data?.error || `Failed to send Munin to the meeting (${res.status}).`);
    } catch (err) {
      setJoinError(err.message || "Failed to send Munin to the meeting.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (id) => {
    setLeavingId(id);
    try {
      const res = await api.leaveMeeting(id);
      if (res.ok && res.data?.meeting) {
        setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...normalizeMeeting(res.data.meeting) } : m)));
      } else if (!res.ok) {
        alert(res.data?.error || `Couldn't remove Munin from the call (${res.status}).`);
      }
    } catch (err) {
      alert(err.message || "Couldn't remove Munin from the call.");
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title="Meetings">
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 14 }}>Send Munin into a live Zoom, Google Meet, or Teams call — it joins as a bot, captions the conversation, and extracts knowledge into a session incrementally while the call is still happening.</div>
          {configStatus && configStatus.recallConfigured && !configStatus.meetingWebhookConfigured && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: C.amberSofter, border: "1px solid rgba(217,164,65,0.3)", borderRadius: 8, fontSize: 12, color: C.amber }}>
              PUBLIC_BASE_URL is not configured — Munin will still join, but no transcript will be captured, so no session will be created. Set PUBLIC_BASE_URL in the backend .env (e.g. a static ngrok domain) to fix this.
            </div>
          )}
          <form onSubmit={handleJoin} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "2 1 260px" }}>
              <label style={labelStyle}>Meeting URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" style={inputStyle} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>Bot name</label>
              <input value={botName} onChange={(e) => setBotName(e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" disabled={joining || !url.trim()} style={{ ...btnPrimary, opacity: joining || !url.trim() ? 0.6 : 1 }}>
              <Icon d={icons.video} size={14} /> {joining ? "Sending…" : "Send Munin to meeting"}
            </button>
          </form>
          {joinError && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: C.redSoft, border: "1px solid rgba(196,104,90,0.3)", borderRadius: 8, fontSize: 12.5, color: C.red }}>{joinError}</div>
          )}
        </Card>

        {meetings.length === 0 ? (
          <div style={{ color: C.textFaint, fontSize: 13, padding: "8px 2px" }}>No meetings yet. Paste a meeting link above to send Munin in live.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {meetings.map((m) => {
              const meta = meetingStatusMeta(m.status);
              const active = !MEETING_TERMINAL.has(m.status);
              return (
                <Card key={m.id} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: C.text, marginBottom: 2 }}>{m.botName}</div>
                    <div style={{ fontSize: 11.5, color: C.textFaint, fontFamily: FF.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.meetingUrl}</div>
                    {m.error && <div style={{ fontSize: 11.5, color: C.red, marginTop: 4 }}>{m.error}</div>}
                    {m.warning && <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4 }}>{m.warning}</div>}
                  </div>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                  {active && (
                    <button onClick={() => handleLeave(m.id)} disabled={leavingId === m.id} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12.5 }}>
                      <Icon d={icons.logOut} size={13} /> {leavingId === m.id ? "Leaving…" : "Leave"}
                    </button>
                  )}
                  {m.sessionId && (
                    <button onClick={() => goToSession(m.sessionId)} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12.5 }}>
                      View session <Icon d={icons.chevronRight} size={13} />
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ============================== APP ROOT ============================== */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sessions, setSessions] = useState([]);
  const [knowledgeObjects, setKnowledgeObjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [readiness, setReadiness] = useState({});
  const [stats, setStats] = useState({ sessionsProcessed: 0, transcriptSegments: 0, knowledgeObjects: 0, needsReview: 0, openGaps: 0, totalGaps: 0, overallReadiness: 0 });
  const [activity, setActivity] = useState([]);
  const [sme, setSme] = useState({});
  const [keyPersonRisk, setKeyPersonRisk] = useState(new Set());
  const [jumpTarget, setJumpTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [configStatus, setConfigStatus] = useState(null);
  const [dismissConfigBanner, setDismissConfigBanner] = useState(false);

  const applySmeMap = (res) => {
    const byModule = {};
    const risky = new Set();
    for (const m of res.modules) {
      byModule[m.module] = m.contributors;
      if (m.keyPersonRisk) risky.add(m.module);
    }
    setSme(byModule);
    setKeyPersonRisk(risky);
  };

  const fetchDashboard = async () => {
    const d = await api.dashboard();
    setStats(d.stats);
    setReadiness(d.readiness);
    setActivity(d.activity);
  };
  const fetchCoverage = async () => {
    const c = await api.coverage();
    setTopics(c.topics);
    setGaps(c.gaps);
  };

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [, sessionsList, kos] = await Promise.all([
        fetchDashboard(),
        api.sessions(),
        api.knowledgeObjects(),
        fetchCoverage(),
        api.smeMap().then(applySmeMap),
      ]);
      setSessions(sessionsList);
      setKnowledgeObjects(kos);
    } catch (err) {
      console.error(err);
      setLoadError(err.message || "Failed to load data from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Meetings aren't part of fetchAll's critical path — a failure here
  // shouldn't block the rest of the app from loading, so it's a separate,
  // best-effort fetch.
  useEffect(() => {
    api.meetings()
      .then((res) => setMeetings((res.meetings || []).map(normalizeMeeting)))
      .catch((err) => console.error("Failed to load meetings:", err));
  }, []);

  // Best-effort: lets the UI warn about missing GROQ_API_KEY / RECALL_API_KEY
  // / PUBLIC_BASE_URL up front instead of the user discovering it via a
  // confusing failure mid-demo.
  useEffect(() => {
    api.settingsStatus()
      .then(setConfigStatus)
      .catch((err) => console.error("Failed to load config status:", err));
  }, []);

  // Returns true if Session 9 was already uploaded (so the caller can skip
  // the celebratory flash banner).
  const handleUploadComplete = async () => {
    try {
      const res = await api.uploadSession();
      if (res.alreadyUploaded) return true;

      setSessions((prev) => [...prev, res.session]);
      setKnowledgeObjects((prev) => [...prev, ...res.newKnowledgeObjects]);
      setReadiness((prev) => ({ ...prev, ...res.updatedReadiness }));
      setGaps((prev) => prev.map((g) => (g.id === res.closedGapId ? { ...g, status: "Closed" } : g)));
      // Topics depth, activity feed, and headline stats live server-side —
      // pull the authoritative versions rather than re-deriving them here.
      await Promise.all([fetchDashboard(), fetchCoverage()]);
      return false;
    } catch (err) {
      console.error(err);
      alert("Upload failed — is the backend running?");
      return true;
    }
  };

  const goToTranscript = (ko) => {
    const segTime = ko.source.split(", ").pop();
    setJumpTarget({ sessionId: ko.sessionId, segTime });
    setPage("sessions");
  };

  const goToMeetingSession = (sessionId) => {
    setJumpTarget({ sessionId, segTime: undefined });
    setPage("sessions");
  };

  // Called after a real document upload succeeds (see UploadModal / Sessions).
  // The backend's document-upload route only persists the session + KOs +
  // an activity row — unlike the demo /sessions/upload route it doesn't also
  // recompute readiness or close a coverage gap, so those two just keep
  // showing their existing values here (an honest limitation, not a bug).
  const handleRealUpload = async (data) => {
    const { session, knowledgeObjects: newKOs } = data;
    setSessions((prev) => [
      ...prev,
      { ...session, date: new Date().toISOString().slice(0, 10), duration: "N/A", attendees: ["Document Upload"] },
    ]);
    setKnowledgeObjects((prev) => [...prev, ...newKOs]);
    try {
      await fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Reset all demo data back to its initial seeded state? This can't be undone.")) return;
    setResetting(true);
    try {
      await api.resetDemo();
      await fetchAll();
    } catch (err) {
      console.error(err);
      alert("Reset failed — is the backend running?");
    } finally {
      setResetting(false);
    }
  };

  const openGapsCount = gaps.filter((g) => g.status !== "Closed").length;

  if (loading) {
    return (
      <div style={{ fontFamily: FF.sans, background: C.bg, color: C.textFaint, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 640, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
          <div style={{ color: C.amber }}><IconRaven size={22} /></div> Loading Munin…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 640, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <div style={{ color: C.red, marginBottom: 14, display: "flex", justifyContent: "center" }}><Icon d={icons.alert} size={26} /></div>
          <div style={{ fontSize: 14.5, marginBottom: 6 }}>Couldn't reach the Munin backend</div>
          <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 18 }}>{loadError}<br />Make sure it's running at {API_BASE}.</div>
          <button onClick={fetchAll} style={btnPrimary}><Icon d={icons.refresh} size={14} /> Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, display: "flex", minHeight: 640, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar page={page} setPage={setPage} openGapsCount={openGapsCount} onResetDemo={handleResetDemo} resetting={resetting} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <EngagementHeader />
        {configStatus && !dismissConfigBanner && (!configStatus.groqConfigured || !configStatus.recallConfigured || !configStatus.meetingWebhookConfigured) && (
          <div style={{ margin: "0 32px", marginTop: 18, padding: "10px 14px", background: C.amberSofter, border: "1px solid rgba(217,164,65,0.3)", borderRadius: 8, fontSize: 12, color: C.amber, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon d={icons.alert} size={14} />
            <div style={{ flex: 1 }}>
              {!configStatus.groqConfigured && <div>GROQ_API_KEY is not set — document/meeting knowledge extraction and generative Ask Munin answers are disabled (Ask Munin still works via keyword search).</div>}
              {!configStatus.recallConfigured && <div>RECALL_API_KEY is not set — the Meetings feature (joining live calls) is disabled.</div>}
              {configStatus.recallConfigured && !configStatus.meetingWebhookConfigured && <div>PUBLIC_BASE_URL is not set — Munin can still join a meeting, but will not capture any transcript from it (no session will be created).</div>}
            </div>
            <button onClick={() => setDismissConfigBanner(true)} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", padding: 2 }}><Icon d={icons.x} size={14} /></button>
          </div>
        )}
        {page === "dashboard" && <Dashboard stats={stats} readiness={readiness} activity={activity} setPage={setPage} />}
        {page === "sessions" && <Sessions sessions={sessions} onUploadComplete={handleUploadComplete} onRealUpload={handleRealUpload} jumpTarget={jumpTarget} clearJumpTarget={() => setJumpTarget(null)} />}
        {page === "meetings" && <Meetings meetings={meetings} setMeetings={setMeetings} refreshAfterProcessing={fetchDashboard} goToSession={goToMeetingSession} configStatus={configStatus} />}
        {page === "kb" && <KnowledgeBase knowledgeObjects={knowledgeObjects} goToTranscript={goToTranscript} />}
        {page === "coverage" && <Coverage topics={topics} gaps={gaps} />}
        {page === "sme" && <SMEMap sme={sme} keyPersonRisk={keyPersonRisk} />}
        {page === "chat" && <AskMunin onGapLogged={fetchCoverage} />}
      </div>
    </div>
  );
}
