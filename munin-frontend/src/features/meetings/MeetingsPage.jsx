import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "./api";
import {
  C,
  FF,
  Card,
  Section,
  Pill,
  Icon,
  icons,
  btnPrimary,
  btnGhost,
  Input,
} from "../../shared/components/common";

import { invalidateEngagementScopedQueries } from "../../shared/api/client";
import { useMeetings } from "./hooks/useMeetings";
import { useNavigate } from "react-router-dom";
import { useModules } from "../../shared/hooks/useModules";
import { useToast } from "../../shared/components/Toast";
/* ============================== MEETINGS ============================== */
const MEETING_TERMINAL = new Set(["call_ended", "done", "error", "fatal"]);

function meetingStatusMeta(status) {
  const map = {
    joining: { label: "Joining…", tone: "scheduled" },
    joining_call: { label: "Joining…", tone: "scheduled" },
    in_waiting_room: { label: "In waiting room", tone: "scheduled" },
    in_call_not_recording: { label: "In call", tone: "open" },
    in_call_recording: { label: "Recording", tone: "open" },
    in_call: { label: "In call", tone: "open" },
    call_ended: { label: "Call ended", tone: "closed" },
    done: { label: "Processed", tone: "closed" },
    error: { label: "Error", tone: "error" },
    fatal: { label: "Error", tone: "error" },
  };
  return map[status] || { label: status || "Unknown", tone: "default" };
}

function Meetings({ configStatus, engagementId}) {
  const showToast = useToast();
  const modules = useModules(engagementId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const goToSession = (sessionId) => {
    navigate("/sessions", {
      state: {
        sessionId,
        segTime: undefined,
      },
    });
  };
  const { meetings, updateMeetings, handleJoin: joinMeetingHook, handleLeave: leaveMeetingHook } = useMeetings(engagementId);
  const setMeetings = updateMeetings;
  const [url, setUrl] = useState("");
  const [botName, setBotName] = useState("Munin");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  

  const labelStyle = { display: "block", fontSize: 11.5, color: C.textFaint, marginBottom: 5 };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!url.trim() || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinMeetingHook(url.trim(), botName.trim() || "Munin", meetingTitle.trim());
      if (result.ok) setUrl("");
      else setJoinError(result.error);
    } catch (err) {
      setJoinError(err.message || "Failed to send Munin to the meeting.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (id) => {
    setLeavingId(id);
    const result = await leaveMeetingHook(id);
    if (!result.ok) showToast(result.error);
    setLeavingId(null);
  };

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title={`Meetings (${meetings.length})`}>
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 14 }}>Send Munin into a live Zoom, Google Meet, or Teams call — it joins as a bot, captions the conversation, and extracts knowledge into a session incrementally while the call is still happening.</div>
          {configStatus && configStatus.recallConfigured && !configStatus.meetingWebhookConfigured && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: C.amberSofter, border: "1px solid rgba(217,164,65,0.3)", borderRadius: 8, fontSize: 12, color: C.amber }}>
              PUBLIC_BASE_URL is not configured — Munin will still join, but no transcript will be captured, so no session will be created. Set PUBLIC_BASE_URL in the backend .env (e.g. a static ngrok domain) to fix this.
            </div>
          )}
          <form onSubmit={handleJoin} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "2 1 260px" }}>
              <label style={labelStyle}>Meeting URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" style={{ borderRadius: 7, padding: "8px 10px", width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>Bot name</label>
              <Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="Munin" style={{ borderRadius: 7, padding: "8px 10px", width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>Meeting name</label>
              <Input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} placeholder="e.g. Payroll Deep Dive" style={{ borderRadius: 7, padding: "8px 10px", width: "100%", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={joining || !url.trim()} style={{ ...btnPrimary, opacity: joining || !url.trim() ? 0.6 : 1 }}>
              <Icon d={icons.video} size={14} /> {joining ? "Sending…" : "Send Munin to meeting"}
            </button>
          </form>
          {joinError && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: C.redSoft, border: "1px solid rgba(196,104,90,0.3)", borderRadius: 8, fontSize: 12.5, color: C.red }}>{joinError}</div>
          )}
        </Card>

        {meetings.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textFaint, padding: "20px 0" }}>No meetings yet — send Munin into a live call above to get started.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {meetings.map((m, i) => {
              const meta = meetingStatusMeta(m.status);
              const active = !MEETING_TERMINAL.has(m.status);
              const participants = (m.participants || []).filter(
                (p) => p !== m.botName
              );
              const durationText =
                m.durationSeconds != null
                  ? `${Math.max(1, Math.round(m.durationSeconds / 60))} min`
                  : null;
              return (
                <Card key={m.id} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div
                        style={{
                          fontFamily: FF.mono,
                          fontSize: 12,
                          color: C.textFaint,
                          width: 26,
                          flexShrink: 0,
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, color: C.text, marginBottom: 2 }}>
                          {m.meetingTitle || m.botName}
                        </div>

                        <div
                          style={{
                            fontSize: 11.5,
                            color: C.textFaint,
                            fontFamily: FF.mono,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {m.meetingUrl}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: C.textFaint,
                            marginTop: 4,
                          }}
                        >
          
                          {m.createdAt?.split("T")[0]}
                            {m.createdAt
                              ? ` ${new Date(m.createdAt).toLocaleTimeString("en-IN", {
                                  timeZone: "Asia/Kolkata",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          {durationText ? ` · ${durationText}` : ""}
                          {participants.length
                            ? ` · ${participants.length} Participant${participants.length > 1 ? "s" : ""}`
                            : ""}

                        </div>
                        {participants.length > 0 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: C.textFaint,
                              marginTop: 4,
                            }}
                          >
                            {participants.join(", ")}
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Pill tone="amber">
                            {m.module || "Unclassified"}
                          </Pill>
                          {/* Classification is restricted to this engagement's
                              defined modules (or "Unclassified") — the backend
                              rejects anything else, so this is never a free-text
                              field. New modules are defined on Engagement Setup. */}
                          <select
                            value={m.module || "Unclassified"}
                            onChange={async (e) => {
                              const newModule = e.target.value;
                              const previous = m.module;
                              setMeetings((prev) => prev.map((meeting) => (meeting.id === m.id ? { ...meeting, module: newModule } : meeting)));
                              try {
                                await meetingsApi.updateMeetingModule(m.id, newModule);
                                // Reclassifying shifts completed-session counts
                                // between modules (and can drop an orphaned
                                // module), so the Dashboard/SME map/Engagement
                                // Setup all need fresh data, not just this list.
                                invalidateEngagementScopedQueries(queryClient, engagementId);
                              } catch (err) {
                                console.error(err);
                                showToast(err.message || "Failed to update meeting module.");
                                setMeetings((prev) => prev.map((meeting) => (meeting.id === m.id ? { ...meeting, module: previous } : meeting)));
                              }
                            }}
                            style={{
                              background: C.bgRaised,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 12,
                              fontFamily: FF.sans,
                            }}
                          >
                            <option value="Unclassified">Unclassified</option>
                            {modules.map((mod) => (
                              <option key={mod.name} value={mod.name}>{mod.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              if (!window.confirm("Delete this meeting and all related data?")) return;
                              try {
                                await meetingsApi.deleteMeeting(m.id);
                                setMeetings((prev) => prev.filter((meeting) => meeting.id !== m.id));
                              } catch (err) {
                                console.error(err);
                                showToast("Failed to delete meeting");
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: C.red,
                              cursor: "pointer",
                              fontSize: 12,
                              padding: 0,
                            }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {m.error && (
                      <div style={{ fontSize: 11.5, color: C.red, marginTop: 4 }}>
                        {m.error}
                      </div>
                    )}

                    {m.warning && (
                      <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4 }}>
                        {m.warning}
                      </div>
                    )}
                  </div>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                  {active && (
                    <button onClick={() => handleLeave(m.id)} disabled={leavingId === m.id} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12.5 }}>
                      <Icon d={icons.logOut} size={13} /> {leavingId === m.id ? "Leaving…" : "Leave"}
                    </button>
                  )}
                  {m.sessionId && (
                    <button onClick={() => goToSession(m.sessionId)} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12.5 }}>
                      View session <Icon d={icons.chevronRight} size={13} />
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
export default Meetings;