import React from "react";

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
  dots: <><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  pin: <><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></>,
  archive: <><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></>,
  panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  trash: <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
};

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
    }}>{low ? "Low confidence · " : ""}{Math.round(v * 100)}%</span>
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
// Quantitative coverage bar (e.g. "sessions covered / sessions planned").
// `value` is a 0-100 percentage; colors shift from amber toward green as it
// approaches completion so the same component reads well at 5% or 95%.
function ProgressBar({ value, height = 8, label, sub }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const color = pct >= 100 ? C.green : C.amber;
  return (
    <div>
      {(label || sub) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          {label && <span style={{ fontSize: 12.5, color: C.textMuted }}>{label}</span>}
          {sub !== undefined && <span style={{ fontSize: 12.5, color: C.text, fontFamily: FF.mono, fontWeight: 500 }}>{sub ?? `${pct}%`}</span>}
        </div>
      )}
      <div style={{ height, background: "#1E2027", borderRadius: height, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />
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
export {
  C,
  FF,
  FONT_IMPORT,
  Icon,
  IconRaven,
  icons,
  Card,
  Section,
  Pill,
  TypeBadge,
  ConfidenceBadge,
  ProgressBar,
  btnPrimary,
  btnGhost,
};