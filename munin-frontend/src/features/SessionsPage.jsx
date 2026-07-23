import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  C,
  FF,
  Card,
  Section,
  Pill,
  Icon,
  IconRaven,
  icons,
  TypeBadge,
  ConfidenceBadge,
  btnPrimary,
  btnGhost,
} from "../components/common";

import { api, invalidateEngagementScopedQueries } from "../api";
import { SME } from "../constants";

/* ============================== SESSIONS ============================== */
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
            await api.updateSessionModule(s.id, newModule);
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
          <option key={m} value={m}>
            {m}
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

function UploadFlow({ onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const steps = ["Transcribing", "Extracting", "Indexing"];
  useEffect(() => {
    if (step >= steps.length) { const t = setTimeout(onComplete, 700); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((s) => s + 1), 2000);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(6,6,8,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <Card style={{ width: 420, padding: "32px 30px", textAlign: "center" }}>
        <div style={{ color: C.amber, marginBottom: 18, display: "flex", justifyContent: "center" }}><IconRaven size={30} /></div>
        <div style={{ fontSize: 14.5, color: C.text, marginBottom: 4 }}>Processing session recording</div>
        <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 26, fontFamily: FF.mono }}>notification-gateway-failover-dr.mp4</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map((label, i) => {
            const done = i < step, active = i === step;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i > step ? 0.35 : 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${done ? C.amber : active ? C.amber : C.border}`, background: done ? C.amber : "transparent",
                }}>
                  {done ? <Icon d={icons.check} size={11} color="#1A1408" /> : active ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber, animation: "muninPulse 1s infinite" }} /> : null}
                </div>
                <span style={{ fontSize: 13, color: done || active ? C.text : C.textFaint, textAlign: "left" }}>{label}{active ? "…" : ""}</span>
              </div>
            );
          })}
        </div>
        <style>{`@keyframes muninPulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      </Card>
    </div>
  );
}

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(6,6,8,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };

function UploadModal({ onClose, onRealUploadComplete, engagementId }) {
  const [mode, setMode] = useState("choose"); // choose | demo | uploading-document | uploading-media | error
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const documentInputRef = useRef(null);
  const mediaInputRef = useRef(null);

  const optionCardStyle = {
    textAlign: "left", padding: "14px 16px", background: C.bgRaised, border: `1px solid ${C.border}`,
    borderRadius: 8, cursor: "pointer", fontFamily: FF.sans, width: "100%",
  };

  // Two genuinely separate upload paths, not one endpoint that branches on
  // file type — documents go straight to text extraction, recordings need
  // a speech-to-text pass first (Groq Whisper) before extraction can run.
  const handleDocumentFile = async (f) => {
    setFile(f);
    setError(null);
    setMode("uploading-document");
    const res = await api.uploadDocument(f, engagementId);
    if (res.ok) onRealUploadComplete(res.data);
    else { setError(res.data?.error || `Upload failed (${res.status}).`); setMode("error"); }
  };

  const handleMediaFile = async (f) => {
    setFile(f);
    setError(null);
    setMode("uploading-media");
    const res = await api.uploadMedia(f, engagementId);
    if (res.ok) onRealUploadComplete(res.data);
    else { setError(res.data?.error || `Upload failed (${res.status}).`); setMode("error"); }
  };

  // if (mode === "demo") {
  //   return <UploadFlow onClose={onClose} onComplete={onDemoComplete} />;
  // }

  return (
    <div style={overlayStyle}>
      <Card style={{ width: 460, padding: "26px 26px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Upload session</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 2 }}><Icon d={icons.x} size={16} /></button>
        </div>

        {mode === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* <button onClick={() => setMode("demo")} style={optionCardStyle}>
              <div style={{ fontSize: 13.5, color: C.text, marginBottom: 3 }}>Use sample recording</div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>Runs the demo pipeline against a canned KT recording — good for a quick walkthrough.</div>
            </button> */}
            <button onClick={() => documentInputRef.current?.click()} style={optionCardStyle}>
              <div style={{ fontSize: 13.5, color: C.text, marginBottom: 3 }}>Upload a document</div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>.txt, .md, .pdf or .docx — text is extracted and run through real knowledge extraction.</div>
            </button>
            <button onClick={() => mediaInputRef.current?.click()} style={optionCardStyle}>
              <div style={{ fontSize: 13.5, color: C.text, marginBottom: 3 }}>Upload a recording</div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>.mp4, .mp3, .wav, .m4a or .webm (max 25MB) — real speech-to-text (Groq Whisper), then the same extraction pipeline.</div>
            </button>
            <input
              ref={documentInputRef} type="file" accept=".txt,.md,.pdf,.docx" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocumentFile(f); }}
            />
            <input
              ref={mediaInputRef} type="file" accept=".mp4,.mp3,.mpeg,.mpga,.m4a,.wav,.webm" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaFile(f); }}
            />
          </div>
        )}

        {mode === "uploading-document" && (
          <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
            <div style={{ color: C.amber, marginBottom: 14, display: "flex", justifyContent: "center" }}><IconRaven size={26} /></div>
            <div style={{ fontSize: 13.5, color: C.text, marginBottom: 4 }}>Extracting knowledge from {file?.name}…</div>
            <div style={{ fontSize: 12, color: C.textFaint }}>Running the real extraction pipeline — this can take a few seconds.</div>
          </div>
        )}

        {mode === "uploading-media" && (
          <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
            <div style={{ color: C.amber, marginBottom: 14, display: "flex", justifyContent: "center" }}><IconRaven size={26} /></div>
            <div style={{ fontSize: 13.5, color: C.text, marginBottom: 4 }}>Transcribing {file?.name}…</div>
            <div style={{ fontSize: 12, color: C.textFaint }}>Speech-to-text first, then knowledge extraction — larger files can take a little longer.</div>
          </div>
        )}

        {mode === "error" && (
          <div>
            <div style={{ padding: "12px 14px", background: C.redSoft, border: "1px solid rgba(196,104,90,0.3)", borderRadius: 8, fontSize: 12.5, color: C.red, marginBottom: 16, lineHeight: 1.5 }}>{error}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setMode("choose")} style={btnGhost}>Try again</button>
              <button onClick={onClose} style={btnGhost}>Close</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Sessions({ sessions, setSessions, modules, engagementId, onUploadComplete, onRealUpload, jumpTarget, clearJumpTarget }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState(null);
  
  const openSession = async (id, segTimeToScrollTo) => {
    setLoadingSelected(true);
    try {
      const full = await api.session(id);
      setSelected(full);
      if (segTimeToScrollTo) {
        setTimeout(() => {
          document.getElementById(`seg-${id}-${segTimeToScrollTo}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }
    } catch (err) {
      console.error(err);
      alert("Couldn't load that session — is the backend running?");
    } finally {
      setLoadingSelected(false);
    }
  };

  useEffect(() => {
    if (jumpTarget) {
      openSession(jumpTarget.sessionId, jumpTarget.segTime);
      clearJumpTarget();
    }
  }, [jumpTarget]);

  if (loadingSelected) {
    return <div style={{ padding: "26px 32px 48px", color: C.textFaint, fontSize: 13 }}>Loading session…</div>;
  }

  if (selected) {
    const kos = selected.knowledgeObjects || [];
    return (
      <div style={{ padding: "26px 32px 48px" }}>
        <button onClick={() => setSelected(null)} style={{ ...btnGhost, marginBottom: 18, padding: "6px 12px" }}>← Back to sessions</button>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Session {String(selected.num).padStart(2, "0")} · {selected.module}</div>
          <h1 style={{ fontSize: 19, fontWeight: 500, margin: "0 0 6px" }}>{selected.title}</h1>
          <div style={{ fontSize: 12.5, color: C.textFaint }}>{selected.date} · {selected.duration} · {selected.attendees.map((a) => `${a} — ${SME[a] || ""}`).join(" · ")}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Card style={{ flex: 1.3, padding: "18px 20px", maxHeight: 640, overflowY: "auto" }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.4 }}>Transcript</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {selected.transcript.map((seg, i) => (
                <div key={i} id={`seg-${selected.id}-${seg.t}`}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontFamily: FF.mono, fontSize: 11, color: C.amber }}>{seg.t}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: C.text }}>{seg.s}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.6 }}>{seg.x}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ flex: 1, padding: "18px 20px", maxHeight: 640, overflowY: "auto" }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.4 }}>Extracted knowledge ({kos.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {kos.map((k) => (
                <div key={k.id} style={{ padding: "12px 13px", background: C.bgRaised, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{k.title}</span>
                    <TypeBadge type={k.type} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{k.description}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: FF.mono, fontSize: 10.5, color: C.textFaint }}>{k.source.split(", ").pop()}</span>
                    <ConfidenceBadge v={k.confidence} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title={`KT sessions (${sessions.length})`} action={
        <button onClick={() => setUploading(true)} style={btnPrimary}><Icon d={icons.upload} size={14} /> Upload session</button>
      }>
        <Card style={{ padding: "4px 18px" }}>
          {sessions.map((s, index) => (
            <SessionRow
              key={s.id}
              s={{ ...s, displayNum: index + 1 }}
              moduleOptions={modules}
              onClick={() => openSession(s.id)}
              onModuleChange={(id, newModule) => setSessions((prev) => prev.map((sess) => (sess.id === id ? { ...sess, module: newModule } : sess)))}
              onModuleChanged={() => invalidateEngagementScopedQueries(queryClient, engagementId)}
            />
          ))}
        </Card>
      </Section>
      {flash && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: C.amberSofter, border: `1px solid rgba(217,164,65,0.3)`, borderRadius: 8, fontSize: 13, color: C.amber, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={icons.check} size={15} /> {flash}
        </div>
      )}
      {uploading && (
        <UploadModal
          onClose={() => setUploading(false)}
          engagementId={engagementId}
          onRealUploadComplete={async (data) => {
            setUploading(false);
            await onRealUpload(data);
            setFlash(`"${data.session.title}" processed — ${data.knowledgeObjects.length} knowledge object(s) indexed.`);
            setTimeout(() => setFlash(null), 6000);
          }}
        />
      )}
    </div>
  );
}
export default Sessions;