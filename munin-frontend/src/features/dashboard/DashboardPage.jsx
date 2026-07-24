import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

import {
  C,
  FF,
  Card,
  Section,
  Icon,
  icons,
  btnPrimary,
  btnGhost,
  ProgressBar,
} from "../../shared/components/common";
import ReadinessChart from "./ui/ReadinessChart";
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

function Dashboard({ stats, readiness, activity, setPage }) {
  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Card style={{ padding: "18px 20px", marginBottom: 20 }}>
        <ProgressBar
          value={stats.overallReadiness}
          label="Engagement coverage — sessions completed vs. planned"
          sub={`${stats.completedSessions} / ${stats.plannedSessions} sessions`}
          height={10}
        />
      </Card>

      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard
          label="Modules covered"
          value={stats.modulesCovered}
          sub="Modules with KT activity"
        />

        <StatCard
          label="Planned sessions"
          value={stats.plannedSessions}
          sub="Across all modules"
        />

        <StatCard
          label="Completed sessions"
          value={stats.completedSessions}
          sub="KT sessions + meetings"
        />

        <StatCard
          label="Overall readiness"
          value={`${stats.overallReadiness}%`}
          sub={`Across ${Object.keys(readiness).length} modules`}
        />
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
export default Dashboard;