import React from "react";

import {
  C,
  FF,
  Pill,
  Icon,
  icons,
} from "../../../shared/components/common";

import { api } from "../../../shared/api/client";
import { sessionsApi } from "../api";
function SessionRow({ s, onClick, moduleOptions, onModuleChange, onModuleChanged }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left",
      background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "14px 4px", cursor: "pointer", fontFamily: FF.sans,
    }}>
      <div style={{ fontFamily: FF.mono, fontSize: 12, color: C.textFaint, width: 26 }}>{String(s.displayNum).padStart(2, "0")}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: C.text, marginBottom: 3 }}>{s.title}</div>
        <div style={{ fontSize: 12, color: C.textFaint }}>
            {s.date}
            {s.duration && s.duration !== "N/A" ? ` · ${s.duration}` : ""}
            {s.attendees?.length ? ` · ${s.attendees.join(", ")}` : ""}
          </div>
      </div>
      <Pill tone="amber">{s.module}</Pill>
      <select
        value={s.module}
        onClick={(e) => e.stopPropagation()}
        onChange={async (e) => {
          const newModule = e.target.value;
          const previous = s.module;

          try {
            await sessionsApi.updateSessionModule(s.id, newModule);
            onModuleChange(s.id, newModule);
            onModuleChanged?.();
          } catch (err) {
            console.error(err);
            alert(err.message || "Failed to update module");
            onModuleChange(s.id, previous);
          }
        }}
        style={{
          background: "#16171C",
          color: "#F5F3EE",
          border: "1px solid rgba(245,243,238,0.09)",
          borderRadius: "6px",
          padding: "4px 8px",
        }}
      >
        {moduleOptions.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>

      {s.status === "In Progress" ? (
        <span style={{ fontSize: 11.5, color: C.amber, display: "flex", alignItems: "center", gap: 5 }}><Icon d={icons.refresh} size={12} /> In progress</span>
      ) : (
        <span style={{ fontSize: 11.5, color: C.green, display: "flex", alignItems: "center", gap: 5 }}><Icon d={icons.check} size={12} /> Processed</span>
      )}
      <Icon d={icons.chevronRight} size={16} color={C.textFaint} />
    </button>
  );
}
export default SessionRow;