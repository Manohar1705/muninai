import React from "react";
import { C } from "./common";
import { PHASES } from "../constants";
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
export default EngagementHeader;