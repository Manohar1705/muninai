import React, { useEffect } from "react";

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
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { API_BASE } from "../shared/api/client";
import { useQuery, useQueryClient, } from "@tanstack/react-query";
import EngagementSetupPage from "../features/engagement/EngagementSetupPage";
import StarterPage from "../features/starter/StarterPage";
import { useEngagement } from "../features/engagement/hooks/useEngagement";
import { useCurrentEngagement } from "../shared/hooks/useCurrentEngagement";
import { useConfigBanner } from "../shared/hooks/useConfigBanner";
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
  // The engagement currently in view — modules, sessions, meetings, and the
  // dashboard/SME-map pipeline are all scoped to this one engagement.
  // Persisted so a refresh doesn't drop the user back to the Starter page.
const { currentEngagementId, setCurrentEngagementId } = useCurrentEngagement();
  const { engagements, setEngagements } = useEngagement(currentEngagementId);
  const { configStatus, showBanner, dismissBanner } = useConfigBanner();
    
  
  if (!currentEngagementId) {
    return (
      <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, minHeight: "100vh" }}>
        <style>{FONT_IMPORT}</style>
        <StarterPage
          onSelectEngagement={(engagement) => {
            queryClient.invalidateQueries({ queryKey: ["engagements"] });
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
        onSwitchEngagement={() => setCurrentEngagementId(null)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <EngagementHeader
          engagementName={currentEngagement?.name}
          engagementPhase={currentEngagement?.phase}
          onSwitchEngagement={() => setCurrentEngagementId(null)}
        />
        {showBanner && (
          <div style={{ margin: "0 32px", marginTop: 18, padding: "10px 14px", background: C.amberSofter, border: "1px solid rgba(217,164,65,0.3)", borderRadius: 8, fontSize: 12, color: C.amber, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon d={icons.alert} size={14} />
            <div style={{ flex: 1 }}>
              {!configStatus.groqConfigured && <div>GROQ_API_KEY is not set — document/meeting knowledge extraction and generative Ask Munin answers are disabled (Ask Munin still works via keyword search).</div>}
              {!configStatus.recallConfigured && <div>RECALL_API_KEY is not set — the Meetings feature (joining live calls) is disabled.</div>}
              {configStatus.recallConfigured && !configStatus.meetingWebhookConfigured && <div>PUBLIC_BASE_URL is not set — Munin can still join a meeting, but will not capture any transcript from it (no session will be created).</div>}
            </div>
            <button onClick={dismissBanner} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", padding: 2 }}><Icon d={icons.x} size={14} /></button>
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
                engagementId={currentEngagementId}
              />
            }
          />

          <Route
            path="/sessions"
            element={
              <Sessions
                engagementId={currentEngagementId}
         
              />
            }
          />

          <Route
            path="/meetings"
            element={
             <Meetings
                engagementId={currentEngagementId}
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
                engagementId={currentEngagementId}
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