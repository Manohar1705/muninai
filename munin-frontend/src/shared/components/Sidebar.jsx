import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  C,
  FF,
  Icon,
  IconRaven,
  icons,
} from "./common";
/* ============================== SIDEBAR ============================== */
function Sidebar({ openGapsCount, onSwitchEngagement }) {
    const navigate = useNavigate();
    const location = useLocation();
  const items = [
    { id: "dashboard", label: "Dashboard", icon: icons.dashboard },
    { id: "sessions", label: "Sessions", icon: icons.sessions },
    { id: "meetings", label: "Meetings", icon: icons.video },
    { id: "kb", label: "Knowledge base", icon: icons.kb },
    { id: "coverage", label: "Coverage", icon: icons.coverage, badge: openGapsCount },
    { id: "sme", label: "SME map", icon: icons.sme },
    { id: "chat", label: "Ask Munin", icon: icons.chat },
    { id: "engagementSetup", label: "Engagement Setup", icon: icons.settings },
  ];
  const routeMap = {
    dashboard: "/dashboard",
    sessions: "/sessions",
    meetings: "/meetings",
    kb: "/kb",
    coverage: "/coverage",
    sme: "/sme",
    chat: "/chat",
    engagementSetup: "/engagement-setup",
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
        <button
          onClick={onSwitchEngagement}
          title="Return to the engagement selector"
          style={{
            display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", width: "100%", textAlign: "left",
            color: C.textFaint, fontSize: 12.5, background: "transparent", border: "none", cursor: "pointer", fontFamily: FF.sans,
          }}
        >
          <Icon d={icons.arrowRight} size={14} style={{ transform: "rotate(180deg)" }} />
          <span>Switch engagement</span>
        </button>
      </div>
      {/* <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
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
      </div> */}
    </div>
  );
}
export default Sidebar;