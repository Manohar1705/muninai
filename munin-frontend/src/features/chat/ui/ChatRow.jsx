import React, { useState, useEffect, useRef } from "react";

import {
  C,
  FF,
  Icon,
  icons,
} from "../../../shared/components/common";
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
export default ChatRow;