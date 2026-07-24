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
  btnGhost,
} from "../../../shared/components/common";
// Renders "2 / 6 sessions" next to each bar instead of a bare percentage —
// the percentage alone (e.g. "33") has no functional meaning on its own.
function SessionCountLabel({ x, y, width, height, value, completed, planned }) {
  if (value === undefined) return null;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dy={4}
      fontSize={11}
      fontFamily={FF.mono}
      fill={C.textFaint}
    >
      {completed}/{planned}
    </text>
  );
}

function ReadinessChart({ readiness }) {
  const [page, setPage] = useState(0);

  const data = Object.keys(readiness)
    .map((m) => ({
      module: m,
      value: readiness[m]?.pct ?? 0,
      completed: readiness[m]?.completed ?? 0,
      planned: readiness[m]?.planned ?? 0,
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
          margin={{ left: 4, right: 48, top: 4, bottom: 4 }}
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
            formatter={(value, name, props) => [
              `${props.payload.completed} / ${props.payload.planned} sessions (${value}%)`,
              "Coverage",
            ]}
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
            <LabelList
              dataKey="value"
              content={(props) => {
                const d = pagedData[props.index];
                if (!d) return null;
                return <SessionCountLabel {...props} completed={d.completed} planned={d.planned} />;
              }}
            />
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
export default ReadinessChart;