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
} from "../components/common";

import { api } from "../api";
/* ============================== ASK MUNIN (CHAT) ============================== */
function ChatMenu({ conv, onRename, onPin, onArchive, onDelete, onClose }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);
 
  const itemStyle = {
    display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
    background: "none", border: "none", cursor: "pointer", padding: "8px 10px",
    fontSize: 12.5, color: C.text, fontFamily: FF.sans, borderRadius: 6,
  };
 
  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 60,
        background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 4, width: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button style={itemStyle} onClick={() => { onRename(); onClose(); }}>
        <Icon d={icons.edit} size={13} /> Rename
      </button>
      <button style={itemStyle} onClick={() => { onPin(!conv.pinned); onClose(); }}>
        <Icon d={icons.pin} size={13} /> {conv.pinned ? "Unpin chat" : "Pin chat"}
      </button>
      <button style={itemStyle} onClick={() => { onArchive(!conv.archived); onClose(); }}>
        <Icon d={icons.archive} size={13} /> {conv.archived ? "Unarchive" : "Archive"}
      </button>
      <button style={{ ...itemStyle, color: C.red }} onClick={() => { onDelete(); onClose(); }}>
        <Icon d={icons.trash} size={13} /> Delete
      </button>
    </div>
  );
}
 
function ChatRow({ conv, active, onSelect, onRename, onPin, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conv.title);
  const inputRef = useRef(null);
 
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
 
  const commitRename = () => {
    const trimmed = editValue.trim();
    setEditing(false);
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
    else setEditValue(conv.title);
  };
 
  return (
    <div
      onClick={() => !editing && onSelect(conv.id)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 6,
        padding: "9px 8px 9px 10px", borderRadius: 8, marginBottom: 4, cursor: editing ? "default" : "pointer",
        background: active ? C.bgCard : "transparent",
        border: `1px solid ${active ? C.border : "transparent"}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditValue(conv.title); setEditing(false); }
            }}
            onBlur={commitRename}
            style={{
              width: "100%", background: C.bg, border: `1px solid ${C.amber}`, borderRadius: 5,
              color: C.text, fontSize: 12.5, fontFamily: FF.sans, padding: "3px 6px", boxSizing: "border-box",
            }}
          />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {conv.pinned && <Icon d={icons.pin} size={10} color={C.amber} />}
              <div style={{ fontSize: 12.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {conv.title}
              </div>
            </div>
            {conv.lastMessage && (
              <div style={{ fontSize: 11, color: C.textFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                {conv.lastMessage}
              </div>
            )}
          </>
        )}
      </div>
      {!editing && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 4, flexShrink: 0, display: "flex" }}
        >
          <Icon d={icons.dots} size={14} />
        </button>
      )}
      {menuOpen && (
        <ChatMenu
          conv={conv}
          onRename={() => setEditing(true)}
          onPin={onPin}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
 
function ChatSidebar({ conversations, activeId, onSelect, onNewChat, onRename, onPin, onArchive, onDelete, collapsed, onToggleCollapse, loading }) {
  const active = conversations.filter((c) => !c.archived);
  const pinned = active.filter((c) => c.pinned);
  const unpinned = active.filter((c) => !c.pinned);
  const archived = conversations.filter((c) => c.archived);
  const [showArchived, setShowArchived] = useState(false);
 
  if (collapsed) {
    return (
      <div style={{ width: 52, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, gap: 8 }}>
        <button onClick={onToggleCollapse} title="Open sidebar" style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 8 }}>
          <Icon d={icons.panelLeft} size={18} />
        </button>
        <button onClick={onNewChat} title="New chat" style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", padding: 8 }}>
          <Icon d={icons.chat} size={18} />
        </button>
      </div>
    );
  }
 
  const renderRow = (c) => (
    <ChatRow
      key={c.id} conv={c} active={c.id === activeId}
      onSelect={onSelect}
      onRename={(title) => onRename(c.id, title)}
      onPin={(v) => onPin(c.id, v)}
      onArchive={(v) => onArchive(c.id, v)}
      onDelete={() => onDelete(c.id)}
    />
  );
 
  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px 12px" }}>
        <button onClick={onNewChat} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>
          <Icon d={icons.chat} size={13} /> New chat
        </button>
        <button onClick={onToggleCollapse} title="Close sidebar" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, color: C.textFaint, cursor: "pointer", padding: 8, display: "flex" }}>
          <Icon d={icons.panelLeft} size={14} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {loading && <div style={{ fontSize: 12, color: C.textFaint, padding: "8px 4px" }}>Loading…</div>}
        {!loading && active.length === 0 && (
          <div style={{ fontSize: 12, color: C.textFaint, padding: "8px 4px" }}>No conversations yet</div>
        )}
 
        {pinned.length > 0 && (
          <>
            <div style={{ fontSize: 10.5, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 6px 4px" }}>Pinned</div>
            {pinned.map(renderRow)}
          </>
        )}
 
        {unpinned.length > 0 && pinned.length > 0 && (
          <div style={{ fontSize: 10.5, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, padding: "10px 6px 4px" }}>Chats</div>
        )}
        {unpinned.map(renderRow)}
 
        {archived.length > 0 && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            <button
              onClick={() => setShowArchived((v) => !v)}
              style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, padding: "4px 6px", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Icon d={showArchived ? icons.chevronDown : icons.chevronRight} size={10} /> Archived ({archived.length})
            </button>
            {showArchived && archived.map(renderRow)}
          </div>
        )}
      </div>
    </div>
  );
}
 
const ACTIVE_CONVERSATION_KEY = "muninActiveConversationId";
 
function AskMunin({ onGapLogged, goToCitation }) {
  const [conversations, setConversations] = useState([]);
  const [newEngagementName, setNewEngagementName] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_CONVERSATION_KEY) || null);
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
 
  const refreshConversations = () => {
    return api.listConversations()
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
    api.chatHistory(activeId)
      .then((history) => setMessages(history.map((m) => ({ role: m.role, text: m.text, citation: m.citation, isGap: m.isGap }))))
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  }, [activeId]);
 
  const handleNewChat = async () => {
    try {
      const conv = await api.newConversation();
      setConversations((list) => [conv, ...list]);
      setActiveId(conv.id);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };
 
  const handleRenameChat = async (id, title) => {
    try {
      await api.renameConversation(id, title);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't rename that chat — is the backend running?");
    }
  };
 
  const handlePinChat = async (id, pinned) => {
    try {
      await api.pinConversation(id, pinned);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, pinned } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't pin that chat — is the backend running?");
    }
  };
 
  const handleArchiveChat = async (id, archived) => {
    try {
      await api.archiveConversation(id, archived);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, archived } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't archive that chat — is the backend running?");
    }
  };
 
  const handleDeleteChat = async (id) => {
    if (!confirm("Delete this chat? This can't be undone.")) return;
    try {
      await api.deleteConversation(id);
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
      const res = await api.chat(q, activeId);
      if (res.conversationId && res.conversationId !== activeId) setActiveId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", text: res.reply, citation: res.citation, isGap: res.isGap }]);
      if (res.isGap) onGapLogged();
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