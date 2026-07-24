import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  C,
  FF,
  Icon,
  IconRaven,
  icons,
  Card,
  ProgressBar,
  btnPrimary,
  btnGhost,
} from "../../shared/components/common";
import { PHASES } from "../../shared/constants/constants";

import { engagementApi } from "../engagement/api";
/* ============================== STARTER PAGE ============================== */
// Home/landing screen for picking (or starting) an engagement. This is the
// "source of truth" list of engagements — each one owns its own modules,
// sessions, and meetings, so nothing here fetches or infers module data: it
// just surfaces the quantitative pipeline summary the backend already
// computes per engagement (see GET /api/engagements).
//
// Two views live here, swapped with a slide/fade transition rather than a
// full page reload: "home" (select/browse) and "create" (a focused,
// full-screen new-engagement flow) — see NewEngagementView below.

const EASE = [0.4, 0, 0.2, 1];

function HeroGlow() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div
        style={{
          position: "absolute",
          top: -220,
          left: "50%",
          transform: "translateX(-50%)",
          width: 820,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(217,164,65,0.14), rgba(217,164,65,0) 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(245,243,238,0.08), transparent)",
        }}
      />
    </div>
  );
}

function StatStrip({ engagements }) {
  const totals = useMemo(() => {
    const count = engagements.length;
    const planned = engagements.reduce((s, e) => s + (e.stats?.plannedSessions || 0), 0);
    const completed = engagements.reduce((s, e) => s + (e.stats?.completedSessions || 0), 0);
    const avgCoverage = count
      ? Math.round(engagements.reduce((s, e) => s + (e.stats?.overallCoverage || 0), 0) / count)
      : 0;
    return { count, planned, completed, avgCoverage };
  }, [engagements]);

  if (!totals.count) return null;

  const items = [
    { label: "Engagements", value: totals.count },
    { label: "Sessions covered", value: `${totals.completed} / ${totals.planned}` },
    { label: "Avg. coverage", value: `${totals.avgCoverage}%` },
  ];

  return (
    <div style={{ display: "flex", gap: 36, flexWrap: "wrap", marginBottom: 38, paddingBottom: 28, borderBottom: `1px solid ${C.border}` }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ fontSize: 24, fontFamily: FF.mono, fontWeight: 500, color: C.text, lineHeight: 1 }}>{it.value}</div>
          <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 6 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function EngagementCard({ engagement, index, onSelect }) {
  const { stats } = engagement;
  const initial = (engagement.name || "?").trim().charAt(0).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.04, ease: EASE }}
      whileHover={{ y: -3 }}
      style={{ height: "100%" }}
    >
      <Card
        style={{
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          height: "100%",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
        onClick={() => onSelect(engagement)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderStrong; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: C.amberSofter, color: C.amber, fontFamily: FF.mono, fontWeight: 600, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{engagement.name}</div>
            <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 1 }}>{engagement.phase}</div>
          </div>
        </div>

        {engagement.details && (
          <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {engagement.details}
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <ProgressBar
            value={stats?.overallCoverage ?? 0}
            label="Sessions covered"
            sub={`${stats?.completedSessions ?? 0} / ${stats?.plannedSessions ?? 0}`}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: C.textFaint }}>
          <span>{stats?.moduleCount ?? 0} modules defined</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.amber }}>
            Open <Icon d={icons.arrowRight} size={12} />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

function NewEngagementTile({ onClick, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.04, ease: EASE }}
      whileHover={{ y: -3 }}
      style={{ height: "100%" }}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%", height: "100%", minHeight: 168,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
          background: "transparent", border: `1.5px dashed ${C.borderStrong}`, borderRadius: 10,
          color: C.textMuted, cursor: "pointer", fontFamily: FF.sans, fontSize: 13, transition: "border-color 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.color = C.textMuted; }}
      >
        <div style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={icons.plus} size={16} />
        </div>
        <span>New engagement</span>
      </button>
    </motion.div>
  );
}

function NewEngagementView({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState(PHASES[0]);
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const inputStyle = {
    background: C.bgRaised,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 7,
    padding: "10px 12px",
    fontFamily: FF.sans,
    fontSize: 13,
    width: "100%",
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Engagement name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await engagementApi.createEngagement(name.trim(), phase, details.trim());
      onCreated(created);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create engagement.");
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={{ duration: 0.3, ease: EASE }}
      style={{ padding: "48px 32px 56px", maxWidth: 620, margin: "0 auto", minHeight: 500 }}
    >
      <button
        onClick={onCancel}
        style={{
          display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "none",
          color: C.textFaint, cursor: "pointer", fontFamily: FF.sans, fontSize: 12.5, padding: 0, marginBottom: 28,
        }}
      >
        <Icon d={icons.arrowRight} size={13} style={{ transform: "rotate(180deg)" }} /> Back to engagements
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, background: C.amberSofter, color: C.amber,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Icon d={icons.plus} size={18} />
        </div>
        <div style={{ fontSize: 21, fontWeight: 500, color: C.text }}>New engagement</div>
      </div>
      <div style={{ fontSize: 13, color: C.textFaint, marginBottom: 28, marginLeft: 52 }}>
        Set the basics now — modules and session targets are defined once it's created.
      </div>

      <Card style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Engagement name</div>
          <input autoFocus placeholder="e.g. Nova Payments Platform" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Phase</div>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} style={inputStyle}>
            {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Details (optional)</div>
          <textarea
            placeholder="What is this engagement covering?"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
        {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={create} disabled={saving} style={btnPrimary}>{saving ? "Creating…" : "Create engagement"}</button>
          <button onClick={onCancel} disabled={saving} style={btnGhost}>Cancel</button>
        </div>
      </Card>
    </motion.div>
  );
}

function StarterPage({ onSelectEngagement }) {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("home"); // "home" | "create"

  const load = () => {
    setLoading(true);
    setError(null);
    engagementApi.engagements()
      .then(setEngagements)
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load engagements.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <HeroGlow />
      <div style={{ position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {view === "create" ? (
            <NewEngagementView
              onCreated={(created) => {
                setEngagements((prev) => [created, ...prev]);
                onSelectEngagement(created);
              }}
              onCancel={() => setView("home")}
            />
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ padding: "56px 32px 56px", maxWidth: 1080, margin: "0 auto" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ color: C.amber }}><IconRaven size={30} /></div>
                <div style={{ fontSize: 22, fontWeight: 500, color: C.text }}>Munin</div>
              </div>
              <div style={{ fontSize: 15, color: C.textMuted, marginBottom: 8, maxWidth: 560, lineHeight: 1.5 }}>
                The agent that remembers everything.
              </div>
              <div style={{ fontSize: 13, color: C.textFaint, marginBottom: 34 }}>
                Select an engagement to continue, or start a new one.
              </div>

              {!loading && !error && <StatStrip engagements={engagements} />}

              {loading && <div style={{ fontSize: 13, color: C.textFaint }}>Loading engagements…</div>}
              {error && (
                <div style={{ fontSize: 13, color: C.red, marginBottom: 16 }}>
                  {error} <button onClick={load} style={{ ...btnGhost, marginLeft: 10 }}>Retry</button>
                </div>
              )}

              {!loading && !error && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                  <NewEngagementTile onClick={() => setView("create")} index={0} />
                  {engagements.map((e, i) => (
                    <EngagementCard key={e.id} engagement={e} index={i + 1} onSelect={onSelectEngagement} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StarterPage;
