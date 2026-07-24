import React from "react";

import {
  C,
  Card,
  Section,
  Pill,
} from "../../shared/components/common";
import { useCoverage } from "./hooks/useCoverage";
/* ============================== COVERAGE ============================== */
function Coverage() {
  const { topics, gaps } = useCoverage();
  const tones = {
    Open: "open",
    "Scheduled for next session": "scheduled",
    Closed: "closed",
  };

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Card style={{ padding: "20px 22px" }}>
        <Section title={`Open questions & gaps (${gaps.length})`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {gaps.map((g) => (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 4px",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: 13.5,
                    color: C.text,
                  }}
                >
                  {g.question}
                </div>

                <Pill>{g.module}</Pill>

                <Pill tone={tones[g.status]}>
                  {g.status}
                </Pill>
              </div>
            ))}
          </div>
        </Section>
      </Card>
    </div>
  );
}

export default Coverage;