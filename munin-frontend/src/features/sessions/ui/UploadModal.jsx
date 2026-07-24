import React, { useState, useRef, useEffect } from "react";

import {
  C,
  FF,
  Card,
  Icon,
  IconRaven,
  icons,
  btnGhost,
} from "../../../shared/components/common";

import { api } from "../../../shared/api/client";
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
export default UploadModal;