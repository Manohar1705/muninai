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
} from "../components/common";

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
  const [page, setPage] = useState(0);

  const data = Object.keys(readiness)
    .map((m) => ({
      module: m,
      value: readiness[m],
    }))
    .sort((a, b) => b.value - a.value);

  const PAGE_SIZE = 15;

  const pagedData = data.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  return (
    <>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={pagedData}
          layout="vertical"
          margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C.border}
            horizontal={false}
          />

          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{
              fill: C.textFaint,
              fontSize: 11,
              fontFamily: FF.mono,
            }}
            axisLine={{ stroke: C.border }}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="module"
            width={122}
            tick={{
              fill: C.textMuted,
              fontSize: 12.5,
              fontFamily: FF.sans,
            }}
            axisLine={{ stroke: C.border }}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              background: C.bgRaised,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontFamily: FF.sans,
              fontSize: 12,
              color: C.text,
            }}
            labelStyle={{ color: C.text }}
            itemStyle={{ color: C.text }}
          />

          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            barSize={16}
          >
            {pagedData.map((d, i) => (
              <Cell
                key={i}
                fill={C.amber}
                fillOpacity={0.35 + (d.value / 100) * 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: C.textFaint,
          }}
        >
          Showing {Math.min(page * PAGE_SIZE + 1, data.length)}-
          {Math.min((page + 1) * PAGE_SIZE, data.length)}
          {" "}of {data.length} modules
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            style={btnGhost}
          >
            Previous
          </button>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= data.length}
            style={btnGhost}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
function Dashboard({ stats, readiness, activity, setPage }) {
  return (
    <div style={{ padding: "26px 32px 48px" }}>
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