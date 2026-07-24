import React, { useState } from "react";

import {
  C,
  Icon,
  icons,
  btnPrimary,
} from "../../../shared/components/common";

import ChatRow from "./ChatRow";
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
 


export default ChatSidebar;