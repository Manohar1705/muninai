import React, { useMemo } from "react";

import {
  C,
  FF,
  Card,
  Section,
  Pill,
} from "../components/common";

/* ============================== COVERAGE ============================== */
function Coverage({ topics, gaps }) {
  const depthColor = (d) => ["#1E2027", "rgba(217,164,65,0.28)", "rgba(217,164,65,0.58)", C.amber][d];
  const moduleOptions = [...new Set(topics.map((t) => t.module))].sort();
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
              {moduleOptions.map((m) => (
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
export default Coverage;