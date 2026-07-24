import React, { useState, useEffect } from "react";

import { C, FF, FONT_IMPORT, Icon, IconRaven, icons, btnPrimary } from "../shared/components/common";

import Sidebar from "../shared/components/Sidebar";
import EngagementHeader from "../shared/components/EngagementHeader";

import Dashboard from "../features/dashboard/DashboardPage";
import Sessions from "../features/sessions/SessionsPage";
import Meetings from "../features/meetings/MeetingsPage";
import KnowledgeBase from "../features/knowledge/KnowledgePage";
import Coverage from "../features/coverage/CoveragePage";
import SMEMap from "../features/sme/SmeMapPage";
import AskMunin from "../features/chat/ChatPage";
import { dashboardApi } from "../features/dashboard/api";
import { engagementApi } from "../features/engagement/api";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { api, API_BASE, normalizeMeeting } from "../shared/api/client";
import { useQuery, useQueryClient, } from "@tanstack/react-query";
import EngagementSetupPage from "../features/engagement/EngagementSetupPage";
import StarterPage from "../features/starter/StarterPage";
import { useConfigStatus } from "../shared/hooks/useConfigStatus";
import { coverageApi } from "../features/coverage/api";
import { smeApi } from "../features/sme/api";
import { meetingsApi } from "../features/meetings/api";
import { knowledgeApi } from "../features/knowledge/api";
import { useDashboard } from "../features/dashboard/hooks/useDashboard";
import { useSmeMap } from "../features/sme/hooks/useSmeMap";
import { useEngagement } from "../features/engagement/hooks/useEngagement";
import { useCoverage } from "../features/coverage/hooks/useCoverage";
/* ============================== APP ROOT ============================== */

export default function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  // react-router doesn't reset scroll position on navigation (that's a
  // browser-native MPA behavior, not something SPAs get for free) — without
  // this, navigating from a long, scrolled-down page to a shorter one just
  // clamps the old scroll offset to the new page's max, which looks like it
  // "jumps to the bottom" instead of starting at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  // Same path mapping Sidebar uses — kept here so any programmatic
  // "go to page" call (dashboard buttons, KB/meeting/chat citation jumps)
  // actually changes the URL instead of only updating the (otherwise now
  // vestigial) `page` state, which stopped driving rendering once routing
  // moved to react-router's <Routes>.
  const ROUTE_MAP = {
    dashboard: "/dashboard", sessions: "/sessions", meetings: "/meetings", kb: "/kb",
    coverage: "/coverage", sme: "/sme", chat: "/chat", engagementSetup: "/engagement-setup",
  };
  const goToPage = (id) => {
    
    navigate(ROUTE_MAP[id] || `/${id}`);
  };
  // The engagement currently in view — modules, sessions, meetings, and the
  // dashboard/SME-map pipeline are all scoped to this one engagement.
  // Persisted so a refresh doesn't drop the user back to the Starter page.
  const [currentEngagementId, setCurrentEngagementIdState] = useState(() => {
    const saved = localStorage.getItem("munin.currentEngagementId");
    return saved ? Number(saved) : null;
  });
  const setCurrentEngagementId = (id) => {
    setCurrentEngagementIdState(id || null);
    if (id) localStorage.setItem("munin.currentEngagementId", String(id));
    else localStorage.removeItem("munin.currentEngagementId");
  };
  const { stats, readiness, activity } = useDashboard(currentEngagementId);
  const { sme, keyPersonRisk } = useSmeMap(currentEngagementId);
  const { engagements, setEngagements, modules } = useEngagement(currentEngagementId);
  const { topics, gaps } = useCoverage();


  const [resetting, setResetting] = useState(false);

  const configStatus = useConfigStatus();
  const [dismissConfigBanner, setDismissConfigBanner] = useState(false);
  
  // `engagements` is now sourced from the ["engagements"] query above —
  // loading/error state mirrors that query directly instead of a separate
  // imperative fetch, so any invalidateQueries(["engagements"]) call
  // anywhere in the app (module edits, engagement edits, demo reset, etc.)
  // keeps this in sync without a manual page refresh.


  // Best-effort: lets the UI warn about missing GROQ_API_KEY / RECALL_API_KEY
  // / PUBLIC_BASE_URL up front instead of the user discovering it via a
  // confusing failure mid-demo.
 

  // Returns true if Session 9 was already uploaded (so the caller can skip
  // the celebratory flash banner).

  // Called after a real document upload succeeds (see UploadModal / Sessions).
  // The backend's document-upload route only persists the session + KOs +
  // an activity row — unlike the demo /sessions/upload route it doesn't also
  // recompute readiness or close a coverage gap, so those two just keep
  // showing their existing values here (an honest limitation, not a bug).
  
  const handleResetDemo = async () => {
    if (!confirm("Reset all demo data back to its initial seeded state? This can't be undone.")) return;
    setResetting(true);
    try {
      await api.resetDemo();
      // A full reset touches every table, so every cached query (not just
      // engagements) needs to be treated as stale.
      await queryClient.invalidateQueries();
    } catch (err) {
      console.error(err);
      alert("Reset failed — is the backend running?");
    } finally {
      setResetting(false);
    }
  };

  const openGapsCount = gaps.filter((g) => g.status !== "Closed").length;
  
  if (!currentEngagementId) {
    return (
      <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, minHeight: "100vh" }}>
        <style>{FONT_IMPORT}</style>
        <StarterPage
          onSelectEngagement={(engagement) => {
            setEngagements((prev) => (prev.some((e) => e.id === engagement.id) ? prev : [engagement, ...prev]));
            setCurrentEngagementId(engagement.id);
          }}
        />
      </div>
    );
  }

  const currentEngagement = engagements.find((e) => e.id === currentEngagementId);


  return (
    <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, display: "flex", minHeight: 640, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar
      
        openGapsCount={openGapsCount}
        onSwitchEngagement={() => setCurrentEngagementId(null)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <EngagementHeader
          engagementName={currentEngagement?.name}
          engagementPhase={currentEngagement?.phase}
          onSwitchEngagement={() => setCurrentEngagementId(null)}
        />
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
                setPage={goToPage}
              />
            }
          />

          <Route
            path="/sessions"
            element={
              <Sessions
                modules={modules}
                engagementId={currentEngagementId}
         
              />
            }
          />

          <Route
            path="/meetings"
            element={
             <Meetings
                engagementId={currentEngagementId}
                modules={modules}
                configStatus={configStatus}
              />

            }
          />

          <Route
            path="/kb"
            element={<KnowledgeBase />}
          />

          <Route
            path="/coverage"
            element={
              <Coverage />
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
              />
            }
          />
          <Route
            path="/engagement-setup"
            element={<EngagementSetupPage engagementId={currentEngagementId} />}
          />
        </Routes>
       
      </div>
    </div>
  );
}