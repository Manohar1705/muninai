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

import { api } from "../../shared/api/client";
import ChatSidebar from "./ui/ChatSidebar";
import { useQueryClient } from "@tanstack/react-query";
import { chatApi } from "./api";
import { useNavigate } from "react-router-dom";
/* ============================== ASK MUNIN (CHAT) ============================== */


 

const ACTIVE_CONVERSATION_KEY = "muninActiveConversationId";
function AskMunin() {
  const [conversations, setConversations] = useState([]);
  
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_CONVERSATION_KEY) || null);
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const goToCitation = (citation) => {
    if (!citation || !citation.sessionId) return;

    navigate("/sessions", {
      state: {
        sessionId: citation.sessionId,
        segTime: citation.timestamp || undefined,
      },
    });
  };
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
 
  const refreshConversations = () => {
    return chatApi.listConversations()
      .then((list) => {
        setConversations(list);
        return list;
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingConversations(false));
  };
 
  // On first mount: load the sidebar list, then decide which conversation
  // to open — the one remembered in localStorage if it still exists,
  // otherwise the most recent one, otherwise start a fresh empty chat.
  useEffect(() => {
    refreshConversations().then((list) => {
      if (!list) return;
      const remembered = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
      const stillExists = remembered && list.some((c) => c.id === remembered);
      if (stillExists) {
        setActiveId(remembered);
      } else {
        const firstActive = list.find((c) => !c.archived) || list[0];
        if (firstActive) setActiveId(firstActive.id);
        else{
          setActiveId(null);
          setLoadingHistory(false);
        }
      }
    });
  }, []);
 
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId);
  }, [activeId]);
 
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setLoadingHistory(true);
    chatApi.chatHistory(activeId)
      .then((history) => setMessages(history.map((m) => ({ role: m.role, text: m.text, citation: m.citation, isGap: m.isGap }))))
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  }, [activeId]);
 
  const handleNewChat = async () => {
    try {
      const conv = await chatApi.newConversation();
      setConversations((list) => [conv, ...list]);
      setActiveId(conv.id);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };
 
  const handleRenameChat = async (id, title) => {
    try {
      await chatApi.renameConversation(id, title);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't rename that chat — is the backend running?");
    }
  };
 
  const handlePinChat = async (id, pinned) => {
    try {
      await chatApi.pinConversation(id, pinned);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, pinned } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't pin that chat — is the backend running?");
    }
  };
 
  const handleArchiveChat = async (id, archived) => {
    try {
      await chatApi.archiveConversation(id, archived);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, archived } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't archive that chat — is the backend running?");
    }
  };
 
  const handleDeleteChat = async (id) => {
    if (!confirm("Delete this chat? This can't be undone.")) return;
    try {
      await chatApi.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (id === activeId) {
        const nextActive = remaining.find((c) => !c.archived);
        if (nextActive) {
          setActiveId(nextActive.id);
        } else {
          setActiveId(null);
          setMessages([]);
          localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that chat — is the backend running?");
    }
  };
 
  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const res = await chatApi.chat(q, activeId);
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
    } finally {
      setSending(false);
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
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
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
            <div ref={endRef} />
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