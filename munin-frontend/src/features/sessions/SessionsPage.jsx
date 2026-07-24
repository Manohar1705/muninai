import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "./api";
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
} from "../../shared/components/common";

import { api, invalidateEngagementScopedQueries } from "../../shared/api/client";
import { SME } from "../../shared/constants/constants";
import SessionRow from "./ui/SessionRow";
import UploadModal from "./ui/UploadModal";
import { useLocation } from "react-router-dom";
import { useSessions } from "./hooks/useSessions";
/* ============================== SESSIONS ============================== */



function Sessions({ modules, engagementId }) {
  const queryClient = useQueryClient();
  const { sessions, setSessions } = useSessions(engagementId);
  const location = useLocation();
  const routeJumpTarget = location.state;
  const [selected, setSelected] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState(null);
  const handleRealUpload = async (data) => {
    const { session } = data;

    setSessions((prev) => [
      ...prev,
      {
        ...session,
        date: new Date().toISOString().slice(0, 10),
        duration: "N/A",
        attendees: ["Document Upload"],
      },
    ]);

    try {
      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    } catch (err) {
      console.error(err);
    }
  };
  const handleUploadComplete = async () => {
      try {
        const res = await sessionsApi.uploadSession(engagementId);
        if (res.alreadyUploaded) return true;

        setSessions((prev) => [...prev, res.session]);

        // Topics depth, activity feed, and headline stats live server-side —
        // pull the authoritative versions rather than re-deriving them here.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["coverage"] }),
        ]);
        return false;
      } catch (err) {
        console.error(err);
        alert("Upload failed — is the backend running?");
        return true;
      }
    };

  const openSession = async (id, segTimeToScrollTo) => {
    setLoadingSelected(true);
    try {
      const full = await sessionsApi.getSession(id);
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
    if (routeJumpTarget?.sessionId) {
      openSession(
        routeJumpTarget.sessionId,
        routeJumpTarget.segTime
      );
    }
  }, [routeJumpTarget]);

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
            await handleRealUpload(data);
            setFlash(`"${data.session.title}" processed — ${data.knowledgeObjects.length} knowledge object(s) indexed.`);
            setTimeout(() => setFlash(null), 6000);
          }}
        />
      )}
    </div>
  );
}
export default Sessions;