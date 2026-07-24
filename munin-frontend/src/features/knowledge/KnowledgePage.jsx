import React, { useState, useMemo } from "react";

import {
  C,
  FF,
  Card,
  Section,
  TypeBadge,
  ConfidenceBadge,
  Pill,
  Icon,
  icons,
  btnGhost,
} from "../../shared/components/common";
import { useKnowledge } from "./hooks/useKnowledge";
import { useNavigate } from "react-router-dom";
/* ============================== KNOWLEDGE BASE ============================== */
function KnowledgeBase() {
  const { knowledgeObjects } = useKnowledge();
  const navigate = useNavigate();
  const goToTranscript = (ko) => {
    const segTime = ko.source.split(", ").pop();

    navigate("/sessions", {
      state: {
        sessionId: ko.sessionId,
        segTime,
      },
    });
  };
  const [q, setQ] = useState("");
  const [module, setModule] = useState("All");
  const [type, setType] = useState("All");
  const [open, setOpen] = useState(null);
  const types = ["Runbook", "Failure Mode", "Dependency", "Interface", "Batch Job", "Tribal Knowledge"];

  const filtered = useMemo(() => knowledgeObjects.filter((k) => {
    const matchesQ = !q || k.title.toLowerCase().includes(q.toLowerCase()) || k.description.toLowerCase().includes(q.toLowerCase());
    const matchesM = module === "All" || k.module === module;
    const matchesT = type === "All" || k.type === type;
    return matchesQ && matchesM && matchesT;
  }), [q, module, type, knowledgeObjects]);
  const moduleOptions = useMemo(() => [...new Set(knowledgeObjects.map((k) => k.module))].sort(), [knowledgeObjects]);
  const selectStyle = { background: C.bgRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "8px 10px", fontSize: 13, fontFamily: FF.sans };

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title={`Knowledge base (${filtered.length} of ${knowledgeObjects.length})`}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <span style={{ position: "absolute", left: 10, top: 9, color: C.textFaint }}><Icon d={icons.search} size={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search knowledge objects…" style={{ ...selectStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)} style={selectStyle}>
            <option>All</option>{moduleOptions.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            <option>All</option>{types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((k) => (
            <Card key={k.id} onClick={() => setOpen(k)} style={{ padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <TypeBadge type={k.type} />
                <ConfidenceBadge v={k.confidence} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{k.title}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{k.description}</div>
              <Pill>{k.module}</Pill>
            </Card>
          ))}
        </div>
      </Section>

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(6,6,8,0.6)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 420, height: "100%", background: C.bgRaised, borderLeft: `1px solid ${C.border}`, padding: "26px 26px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <TypeBadge type={open.type} />
              <button onClick={() => setOpen(null)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer" }}><Icon d={icons.x} size={18} /></button>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 10px" }}>{open.title}</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <Pill tone="amber">{open.module}</Pill>
              <ConfidenceBadge v={open.confidence} />
            </div>
            <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.7, marginBottom: 22 }}>{open.description}</div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Source citation</div>
              <div style={{ fontFamily: FF.mono, fontSize: 12.5, color: C.text, marginBottom: 14 }}>{open.source}</div>
              <button onClick={() => { goToTranscript(open); setOpen(null); }} style={{ ...btnGhost, width: "100%", justifyContent: "center" }}>
                <Icon d={icons.link} size={14} /> View in transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default KnowledgeBase;