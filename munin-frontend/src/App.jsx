import React, { useState, useEffect } from "react";

import { C, FF, FONT_IMPORT, Icon, IconRaven, icons, btnPrimary } from "./components/common";

import Sidebar from "./components/Sidebar";
import EngagementHeader from "./components/EngagementHeader";

import Dashboard from "./features/DashboardPage";
import Sessions from "./features/SessionsPage";
import Meetings from "./features/MeetingsPage";
import KnowledgeBase from "./features/KnowledgePage";
import Coverage from "./features/CoveragePage";
import SMEMap from "./features/SmeMapPage";
import AskMunin from "./features/ChatPage";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { api, API_BASE, normalizeMeeting } from "./api";
import { useQuery, useQueryClient, } from "@tanstack/react-query";
/* ============================== APP ROOT ============================== */

export default function App() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState("dashboard");
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [modules, setModules] = useState([]);
  const [newEngagementName, setNewEngagementName] = useState("");
  const [sessions, setSessions] = useState([]);
  const {
    data: sessionsData,
    
  } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions,
  });
  useEffect(() => {
    if (!sessionsData) return;

    setSessions(sessionsData);
  }, [sessionsData]);
  const [knowledgeObjects, setKnowledgeObjects] = useState([]);
  const {
    data: knowledgeObjectsData,
    
  } = useQuery({
    queryKey: ["knowledge-objects"],
    queryFn: api.knowledgeObjects,
  });
  useEffect(() => {
    if (!knowledgeObjectsData) return;

    setKnowledgeObjects(knowledgeObjectsData);
  }, [knowledgeObjectsData]);
  const [topics, setTopics] = useState([]);
  const [gaps, setGaps] = useState([]);
  const {
    data: coverageData,
    
  } = useQuery({
    queryKey: ["coverage"],
    queryFn: api.coverage,
  });
  const [readiness, setReadiness] = useState({});
  const [stats, setStats] = useState({ sessionsProcessed: 0, transcriptSegments: 0, knowledgeObjects: 0, needsReview: 0, openGaps: 0, totalGaps: 0, overallReadiness: 0 });
  const [activity, setActivity] = useState([]);
  const {
    data: dashboardData,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });

  const [sme, setSme] = useState({});
  const [keyPersonRisk, setKeyPersonRisk] = useState(new Set());
  const {
    data: smeData,
    
  } = useQuery({
    queryKey: ["sme-map"],
    queryFn: api.smeMap,
  });
  const [jumpTarget, setJumpTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const {
    data: meetingsData,
    
  } = useQuery({
    queryKey: ["meetings"],
    queryFn: api.meetings,
  });
  useEffect(() => {
    if (!meetingsData) return;

    setMeetings(
      (meetingsData.meetings || []).map(normalizeMeeting)
    );
  }, [meetingsData]);
  const [configStatus, setConfigStatus] = useState(null);
  const [dismissConfigBanner, setDismissConfigBanner] = useState(false);

  const applySmeMap = (res) => {
    const byModule = {};
    const risky = new Set();
    for (const m of res.modules) {
      byModule[m.module] = m.contributors;
      if (m.keyPersonRisk) risky.add(m.module);
    }
    setSme(byModule);
    setKeyPersonRisk(risky);
  };
  useEffect(() => {
    if (!smeData) return;

    applySmeMap(smeData);
  }, [smeData]);


  useEffect(() => {
    if (!dashboardData) return;

    setStats(dashboardData.stats);
    setReadiness(dashboardData.readiness);
    setActivity(dashboardData.activity);
  }, [dashboardData]);


  useEffect(() => {
    if (!coverageData) return;

    setTopics(coverageData.topics);
    setGaps(coverageData.gaps);
  }, [coverageData]);

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [engagementList, moduleList] = await Promise.all([
        api.engagements(),
        api.modules(),
      ]);

      
      
      setEngagements(engagementList);
      setModules(moduleList);

      await Promise.all([]);
    } catch (err) {
      console.error(err);
      setLoadError(err.message || "Failed to load data from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Meetings aren't part of fetchAll's critical path — a failure here
  // shouldn't block the rest of the app from loading, so it's a separate,
  // best-effort fetch.


  // Best-effort: lets the UI warn about missing GROQ_API_KEY / RECALL_API_KEY
  // / PUBLIC_BASE_URL up front instead of the user discovering it via a
  // confusing failure mid-demo.
  useEffect(() => {
    api.settingsStatus()
      .then(setConfigStatus)
      .catch((err) => console.error("Failed to load config status:", err));
  }, []);

  // Returns true if Session 9 was already uploaded (so the caller can skip
  // the celebratory flash banner).
  const handleUploadComplete = async () => {
    try {
      const res = await api.uploadSession();
      if (res.alreadyUploaded) return true;

      setSessions((prev) => [...prev, res.session]);
      setKnowledgeObjects((prev) => [...prev, ...res.newKnowledgeObjects]);
      setReadiness((prev) => ({ ...prev, ...res.updatedReadiness }));
      setGaps((prev) => prev.map((g) => (g.id === res.closedGapId ? { ...g, status: "Closed" } : g)));
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

  const goToTranscript = (ko) => {
    const segTime = ko.source.split(", ").pop();
    setJumpTarget({ sessionId: ko.sessionId, segTime });
    setPage("sessions");
  };

  const goToMeetingSession = (sessionId) => {
    setJumpTarget({ sessionId, segTime: undefined });
    setPage("sessions");
  };

  const goToChatCitation = (citation) => { 
    if (!citation || !citation.sessionId) return; 
    setJumpTarget({ sessionId: citation.sessionId, segTime: citation.timestamp || undefined }); 
    setPage("sessions"); 
  };

  // Called after a real document upload succeeds (see UploadModal / Sessions).
  // The backend's document-upload route only persists the session + KOs +
  // an activity row — unlike the demo /sessions/upload route it doesn't also
  // recompute readiness or close a coverage gap, so those two just keep
  // showing their existing values here (an honest limitation, not a bug).
  const handleRealUpload = async (data) => {
    const { session, knowledgeObjects: newKOs } = data;
    setSessions((prev) => [
      ...prev,
      { ...session, date: new Date().toISOString().slice(0, 10), duration: "N/A", attendees: ["Document Upload"] },
    ]);
    setKnowledgeObjects((prev) => [...prev, ...newKOs]);
    try {
      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Reset all demo data back to its initial seeded state? This can't be undone.")) return;
    setResetting(true);
    try {
      await api.resetDemo();
      await fetchAll();
    } catch (err) {
      console.error(err);
      alert("Reset failed — is the backend running?");
    } finally {
      setResetting(false);
    }
  };

  const openGapsCount = gaps.filter((g) => g.status !== "Closed").length;

  if (loading) {
    return (
      <div style={{ fontFamily: FF.sans, background: C.bg, color: C.textFaint, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 640, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
          <div style={{ color: C.amber }}><IconRaven size={22} /></div> Loading Munin…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 640, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <div style={{ color: C.red, marginBottom: 14, display: "flex", justifyContent: "center" }}><Icon d={icons.alert} size={26} /></div>
          <div style={{ fontSize: 14.5, marginBottom: 6 }}>Couldn't reach the Munin backend</div>
          <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 18 }}>{loadError}<br />Make sure it's running at {API_BASE}.</div>
          <button onClick={fetchAll} style={btnPrimary}><Icon d={icons.refresh} size={14} /> Retry</button>
        </div>
      </div>
    );
  }

  // if (!selectedEngagement) {
  //   return (
  //     <EngagementSelector
  //       engagements={engagements}
  //       onSelect={(engagement) => setSelectedEngagement(engagement)}
  //       newEngagementName={newEngagementName}
  //       setNewEngagementName={setNewEngagementName}
  //       onCreate={async () => {
  //         if (!newEngagementName.trim()) return;

  //         try {
  //           await api.createEngagement(newEngagementName.trim());

  //           const list = await api.engagements();
  //           setEngagements(list);
  //           setNewEngagementName("");
  //         } catch (err) {
  //           console.error(err);
  //         }
  //       }}
  //     />
  //   );  
  // }
  
  return (
    <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, display: "flex", minHeight: 640, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar page={page} setPage={setPage} openGapsCount={openGapsCount} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <EngagementHeader />
        {configStatus && !dismissConfigBanner && (!configStatus.groqConfigured || !configStatus.recallConfigured || !configStatus.meetingWebhookConfigured) && (
          <div style={{ margin: "0 32px", marginTop: 18, padding: "10px 14px", background: C.amberSofter, border: "1px solid rgba(217,164,65,0.3)", borderRadius: 8, fontSize: 12, color: C.amber, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon d={icons.alert} size={14} />
            <div style={{ flex: 1 }}>
              {!configStatus.groqConfigured && <div>GROQ_API_KEY is not set — document/meeting knowledge extraction and generative Ask Munin answers are disabled (Ask Munin still works via keyword search).</div>}
              {!configStatus.recallConfigured && <div>RECALL_API_KEY is not set — the Meetings feature (joining live calls) is disabled.</div>}
              {configStatus.recallConfigured && !configStatus.meetingWebhookConfigured && <div>PUBLIC_BASE_URL is not set — Munin can still join a meeting, but will not capture any transcript from it (no session will be created).</div>}
            </div>
            <button onClick={() => setDismissConfigBanner(true)} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", padding: 2 }}><Icon d={icons.x} size={14} /></button>
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={
              <Dashboard
                stats={stats}
                readiness={readiness}
                activity={activity}
                setPage={setPage}
              />
            }
          />

          <Route
            path="/sessions"
            element={
              <Sessions
                sessions={sessions}
                modules={modules}
                onUploadComplete={handleUploadComplete}
                onRealUpload={handleRealUpload}
                jumpTarget={jumpTarget}
                clearJumpTarget={() => setJumpTarget(null)}
              />
            }
          />

          <Route
            path="/meetings"
            element={
             <Meetings
                meetings={meetings}
                setMeetings={setMeetings}
                refreshAfterProcessing={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["dashboard"],
                  })
                }
                goToSession={goToMeetingSession}
                configStatus={configStatus}
              />

            }
          />

          <Route
            path="/kb"
            element={
              <KnowledgeBase
                knowledgeObjects={knowledgeObjects}
                goToTranscript={goToTranscript}
              />
            }
          />

          <Route
            path="/coverage"
            element={
              <Coverage
                topics={topics}
                gaps={gaps}
              />
            }
          />

          <Route
            path="/sme"
            element={
              <SMEMap
                sme={sme}
                keyPersonRisk={keyPersonRisk}
              />
            }
          />

          <Route
            path="/chat"
            element={      
              <AskMunin
                onGapLogged={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["coverage"],
                  })
                }
                goToCitation={goToChatCitation}
              />
            }
          />
        </Routes>
       
      </div>
    </div>
  );
}