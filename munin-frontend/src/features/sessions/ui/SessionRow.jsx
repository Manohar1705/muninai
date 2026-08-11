import React, { useEffect, useState } from "react";

import {
  C,
  FF,
  Pill,
  Icon,
  icons,
  Input,
} from "../../../shared/components/common";
import { sessionsApi } from "../api";
import { useToast } from "../../../shared/components/Toast";
import {
  getSessionTitleError,
  MAX_SESSION_TITLE_LENGTH,
} from "../sessionTitle";

function SessionRow({
  s,
  onClick,
  moduleOptions,
  onTitleChange,
  onTitleChanged,
  onModuleChange,
  onModuleChanged,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const showToast = useToast();
  const [titleDraft, setTitleDraft] = useState(s.title);
  const [titleError, setTitleError] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(s.title);
  }, [editingTitle, s.title]);

  const cancelTitleEdit = () => {
    setTitleDraft(s.title);
    setTitleError("");
    setEditingTitle(false);
  };

  const saveTitle = async () => {
    const error = getSessionTitleError(titleDraft);
    if (error) {
      setTitleError(error);
      return;
    }

    const title = titleDraft.trim();
    if (title === s.title) {
      cancelTitleEdit();
      return;
    }

    setSavingTitle(true);
    setTitleError("");
    try {
      const result = await sessionsApi.updateSessionTitle(s.id, title);
      const savedTitle = result.session?.title || title;
      onTitleChange(s.id, savedTitle);
      setEditingTitle(false);
      onTitleChanged?.();
    } catch (err) {
      setTitleError(err.message || "Failed to rename session.");
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!editingTitle) onClick();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || editingTitle) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        width: "100%",
        textAlign: "left",
        background: "transparent",
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 4px",
        cursor: editingTitle ? "default" : "pointer",
        fontFamily: FF.sans,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: FF.mono, fontSize: 12, color: C.textFaint, width: 26 }}>
        {String(s.displayNum).padStart(2, "0")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingTitle ? (
          <div onClick={(e) => e.stopPropagation()} style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Input
                autoFocus
                value={titleDraft}
                maxLength={MAX_SESSION_TITLE_LENGTH}
                disabled={savingTitle}
                aria-label="Session title"
                onChange={(e) => {
                  setTitleDraft(e.target.value);
                  if (titleError) setTitleError(getSessionTitleError(e.target.value));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTitle();
                  } else if (e.key === "Escape") {
                    cancelTitleEdit();
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: C.bg,
                  borderColor: titleError ? C.red : C.amber,
                  padding: "6px 8px",
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                aria-label="Save session title"
                disabled={savingTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  saveTitle();
                }}
                style={{
                  display: "flex",
                  padding: 5,
                  background: "transparent",
                  border: "none",
                  color: C.green,
                  cursor: savingTitle ? "wait" : "pointer",
                }}
              >
                <Icon d={savingTitle ? icons.refresh : icons.check} size={16} />
              </button>
              <button
                type="button"
                aria-label="Cancel session rename"
                disabled={savingTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelTitleEdit();
                }}
                style={{
                  display: "flex",
                  padding: 5,
                  background: "transparent",
                  border: "none",
                  color: C.textFaint,
                  cursor: "pointer",
                }}
              >
                <Icon d={icons.x} size={16} />
              </button>
            </div>
            {titleError && (
              <div style={{ color: C.red, fontSize: 11.5, marginTop: 4 }}>
                {titleError}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <div style={{ fontSize: 14, color: C.text }}>{s.title}</div>
            <button
              type="button"
              aria-label={`Rename ${s.title}`}
              onClick={(e) => {
                e.stopPropagation();
                setTitleDraft(s.title);
                setTitleError("");
                setEditingTitle(true);
              }}
              style={{
                display: "flex",
                padding: 3,
                background: "transparent",
                border: "none",
                color: C.textFaint,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Icon d={icons.edit} size={13} />
            </button>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.textFaint }}>
          {s.date}
          {s.duration && s.duration !== "N/A" ? ` · ${s.duration}` : ""}
          {s.attendees?.length ? ` · ${s.attendees.join(", ")}` : ""}
        </div>
      </div>
      <Pill tone="amber">{s.module}</Pill>
      <select
        value={s.module}
        onClick={(e) => e.stopPropagation()}
        onChange={async (e) => {
          const newModule = e.target.value;
          const previous = s.module;

          try {
            await sessionsApi.updateSessionModule(s.id, newModule);
            onModuleChange(s.id, newModule);
            onModuleChanged?.();
          } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to update module");
            onModuleChange(s.id, previous);
          }
        }}
        style={{
          background: C.bgCard,
          color: C.text,
          border: "1px solid rgba(245,243,238,0.09)",
          borderRadius: "6px",
          padding: "4px 8px",
        }}
      >
        {moduleOptions.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>

      {s.status === "In Progress" ? (
        <span style={{ fontSize: 11.5, color: C.amber, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={icons.refresh} size={12} /> In progress
        </span>
      ) : (
        <span style={{ fontSize: 11.5, color: C.green, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={icons.check} size={12} /> Processed
        </span>
      )}
      <Icon d={icons.chevronRight} size={16} color={C.textFaint} />
    </div>
  );
}

export default SessionRow;
