import React from "react";

import {
  C,
  FF,
  Icon,
  icons,
  Section,
  Card,
} from "../../shared/components/common";

 
/* ============================== SME MAP ============================== */
function SMEMap({ sme, keyPersonRisk }) {
  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title="SME contribution map">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {Object.keys(sme).map((m) => {
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
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {people.map((p, idx) => (
                    <div
                      key={p.name}
                      style={{
                        paddingBottom: idx < people.length - 1 ? 16 : 0,
                        borderBottom: idx < people.length - 1 ? `1px solid ${C.border}` : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: C.text }}>{p.name}</span>
                        <span style={{ color: C.textFaint, fontFamily: FF.mono }}>{p.share}%</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 3 }}>Talk time</div>
                      <div style={{ height: 5, background: "#1E2027", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ width: `${p.share}%`, height: "100%", background: p.share > 70 ? C.red : C.amber }} />
                      </div>
                      {p.contextShare !== null && p.contextShare !== undefined && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: C.textMuted }}>Knowledge contribution</span>
                            <span style={{ color: C.textFaint, fontFamily: FF.mono }}>{p.contextShare}%</span>
                          </div>
                          <div style={{ height: 5, background: "#1E2027", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${p.contextShare}%`, height: "100%", background: "#8FB4D9" }} />
                          </div>
                        </>
                      )}
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
export default SMEMap;