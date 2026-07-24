import React from "react";
import { C, Icon, icons } from "./common";
import { PHASES } from "../constants/constants";
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
function EngagementHeader({ engagementName, engagementPhase, onSwitchEngagement }) { 
  return (
    <div style={{ position: "relative", padding: "22px 32px 18px", borderBottom: `1px solid ${C.border}` }}>
      {onSwitchEngagement && (
        <button
          onClick={onSwitchEngagement}
          title="Leave this engagement and return to the engagement selector"
          style={{
            position: "absolute", top: 22, right: 32,
            display: "flex", alignItems: "center", gap: 6, background: "transparent",
            border: `1px solid ${C.borderStrong}`, borderRadius: 7, padding: "6px 12px",
            color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.borderStrong; }}
        >
          <Icon d={icons.logOut} size={13} /> Switch engagement
        </button>
      )}
      <div style={{ maxWidth: "calc(100% - 190px)" }}>
        <div style={{ fontSize: 11, color: C.textFaint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>Engagement</div>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 16px" }}>{engagementName || "Unnamed Engagement"}</h1>
      </div>
      {/* <PhaseTracker current={engagementPhase || PHASES[0]} /> */}
    </div>
  );
}
export default EngagementHeader;