import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  C,
  FF,
  Icon,
  IconRaven,
  icons,
  Pill,
} from "./common";
import { useAuth } from "../auth/AuthContext";
// import { useOpenGapsCount } from "../hooks/useOpenGapsCount";
/* ============================== SIDEBAR ============================== */

// The users table only stores an email (no separate display-name column),
// so the email itself is the account's identity here — there's no name to
// show alongside it.
function ProfileMenu({ onSwitchEngagement }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const initial = (user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {open && (
        <div
          style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
            background: C.bgCard, border: `1px solid ${C.borderStrong}`, borderRadius: 9,
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)", padding: 12, zIndex: 20,
          }}
        >
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email}
          </div>
          {user?.teamName && (
            <div style={{ marginTop: 6 }}>
              <Pill tone="amber">{user.teamName}</Pill>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "10px 0" }} />
          <button
            onClick={() => { setOpen(false); onSwitchEngagement(); }}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 6px", width: "100%", textAlign: "left",
              color: C.textMuted, fontSize: 12.5, background: "transparent", border: "none", cursor: "pointer", fontFamily: FF.sans, borderRadius: 6,
            }}
          >
            <Icon d={icons.arrowRight} size={14} style={{ transform: "rotate(180deg)" }} />
            <span>Switch engagement</span>
          </button>
          <button
            onClick={logout}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 6px", width: "100%", textAlign: "left",
              color: C.red, fontSize: 12.5, background: "transparent", border: "none", cursor: "pointer", fontFamily: FF.sans, borderRadius: 6,
            }}
          >
            <Icon d={icons.logOut} size={14} />
            <span>Log out</span>
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title={user?.email}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", textAlign: "left",
          background: open ? C.bgSubtle : "transparent", border: "none", cursor: "pointer", borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
            background: C.amberSofter, color: C.amber, fontFamily: FF.mono, fontWeight: 600, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {initial}
        </div>
        <span style={{ flex: 1, fontSize: 12.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.email}
        </span>
      </button>
    </div>
  );
}

function Sidebar({ onSwitchEngagement, isEngagementAdmin }) {
    // const openGapsCount = useOpenGapsCount();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
  const items = [
    { id: "dashboard", label: "Dashboard", icon: icons.dashboard },
    { id: "sessions", label: "Sessions", icon: icons.sessions },
    { id: "meetings", label: "Meetings", icon: icons.video },
    { id: "kb", label: "Knowledge base", icon: icons.kb },
    // { id: "coverage", label: "Coverage", icon: icons.coverage, badge: openGapsCount },
    { id: "sme", label: "SME map", icon: icons.sme },
    { id: "chat", label: "Ask Munin", icon: icons.chat },
    // Engagement Setup, Team Setup, and LLM Insights are admin-only per the
    // per-email/team access model — hidden entirely for non-admins rather
    // than shown-disabled, since the backend also 403s them outright.
    ...(isEngagementAdmin ? [
      { id: "engagementSetup", label: "Engagement Setup", icon: icons.settings },
      { id: "teamSetup", label: "Team Setup", icon: icons.sme },
      { id: "llmInsights", label: "LLM Insights", icon: icons.clock },
    ] : []),
  ];
  const routeMap = {
    dashboard: "/dashboard",
    sessions: "/sessions",
    meetings: "/meetings",
    kb: "/kb",
    // coverage: "/coverage",
    sme: "/sme",
    chat: "/chat",
    engagementSetup: "/engagement-setup",
    teamSetup: "/team-setup",
    llmInsights: "/llm-insights",
  };
  return (
    <div style={{ width: 236, flexShrink: 0, background: C.bgRaised, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "22px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 30 }}>
        <div style={{ color: C.amber }}><IconRaven size={22} /></div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: 0.2 }}>Munin</div>
          <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: -1 }}>The agent that remembers everything</div>
        </div>
      </div>
      {user?.teamName && (
        <div style={{ padding: "0 8px", marginBottom: 18 }}>
          <Pill tone="amber">{user.teamName}</Pill>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const active = location.pathname === routeMap[it.id];
  
          return (
            <button key={it.id}
            onClick={() => {
              
                navigate(routeMap[it.id]);
            }}

            style={{
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
        <ProfileMenu onSwitchEngagement={onSwitchEngagement} />
      </div>
    </div>
  );
}
export default Sidebar;