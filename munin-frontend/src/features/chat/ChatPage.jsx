import React, { useState, useEffect, useRef } from "react";

import {
  C,
  FF,
  Card,
  Section,
  Icon,
  icons,
  btnPrimary,
  btnGhost,
} from "../../shared/components/common";


import ChatSidebar from "./ui/ChatSidebar";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "./hooks/useChat";
import { useNavigate } from "react-router-dom";
/* ============================== ASK MUNIN (CHAT) ============================== */

function AskMunin({ engagementId }) {
  const queryClient = useQueryClient();
  const activeConversationKey = `muninActiveConversationId:${engagementId || "none"}`;
  const [activeId, setActiveId] = useState(() => localStorage.getItem(activeConversationKey) || null);
  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // Reset the active conversation when the engagement changes
  useEffect(() => {
    setActiveId(localStorage.getItem(activeConversationKey) || null);
  }, [engagementId]);

  const {
    conversations,
    loadingConversations,
    messages,
    loadingHistory,
    setConversations,
    setMessages,
    refreshConversations,
    sendMessage,
    sending,
    handleNewChat,
    handleRenameChat,
    handlePinChat,
    handleArchiveChat,
    handleDeleteChat,
  } = useChat(activeId, setActiveId, engagementId);

  const goToCitation = (citation) => {
    if (!citation || !citation.sessionId) return;

    navigate("/sessions", {
      state: {
        sessionId: citation.sessionId,
        segTime: citation.timestamp || undefined,
      },
    });
  };
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [activeId, messages.length]);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const res = await sendMessage(q);
      if (res.conversationId && res.conversationId !== activeId) setActiveId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", text: res.reply, citation: res.citation, isGap: res.isGap }]);
      if (res.isGap) {
        queryClient.invalidateQueries({
          queryKey: ["coverage"],
        });
      }
      refreshConversations();
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", text: "Sorry — I couldn't reach the backend to answer that. Is it running?", citation: null, isGap: false }]);
    }
  };

  return (
    <div style={{ padding: "26px 32px 32px", display: "flex", height: "calc(100vh - 130px)" }}>
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
        onPin={handlePinChat}
        onArchive={handleArchiveChat}
        onDelete={handleDeleteChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        loading={loadingConversations}
      />
      <div style={{ flex: 1, marginLeft: 20, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Section title="Ask Munin" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: C.textFaint }}>Answers are grounded in the knowledge base and always cite a source. Anything uncovered is logged as a gap automatically.</div>
        </Section>

        <Card style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            ref={messagesContainerRef}
            style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
          >
            {loadingHistory && <div style={{ fontSize: 12.5, color: C.textFaint }}>Loading conversation…</div>}
            {!loadingHistory && messages.length === 0 && (
              <div style={{ fontSize: 12.5, color: C.textFaint }}>Ask a question about the knowledge transfer — e.g. "How does the batch settlement retry work?"</div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.5,
                  background: m.role === "user" ? C.amberSofter : C.bgRaised,
                  color: m.role === "user" ? C.text : C.textMuted,
                  border: `1px solid ${m.role === "user" ? "rgba(217,164,65,0.3)" : C.border}`,
                }}>
                  {m.text}
                </div>
                {m.role === "assistant" && m.citation && (
                  <button onClick={() => goToCitation(m.citation)} style={{ ...btnGhost, marginTop: 6, padding: "5px 10px", fontSize: 11.5 }}>
                    <Icon d={icons.link} size={12} /> {m.citation.sessionTitle || "View source"}
                  </button>
                )}
                {m.role === "assistant" && m.isGap && (
                  <div style={{ marginTop: 6, fontSize: 11, color: C.amber }}>Logged as a coverage gap</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question…"
              disabled={sending}
              style={{ flex: 1, background: C.bgRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "10px 12px", fontSize: 13.5, fontFamily: FF.sans }}
            />
            <button onClick={send} disabled={sending || !input.trim()} style={{ ...btnPrimary, opacity: sending || !input.trim() ? 0.6 : 1 }}>
              <Icon d={icons.send} size={14} /> {sending ? "…" : "Send"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
export default AskMunin;
