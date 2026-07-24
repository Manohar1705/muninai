import React, { useEffect, useState } from "react";

import {
  C,
  FF,
  Icon,
  icons,
  btnGhost,
} from "../../../shared/components/common";

// Modules are the source of truth for session classification: every KT
// session and meeting is filed under exactly one of the modules defined
// here (or "Unclassified"), and Munin never invents a module name on its
// own — it only ever picks among what's defined on this page.
function ModuleRow({ module, onRename, onPlanChange, onDelete }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(module.name);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = !module.completed_sessions;

  useEffect(() => { setNameDraft(module.name); }, [module.name]);

  const inputStyle = {
    background: C.bgRaised,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 6,
    padding: "6px 8px",
    fontFamily: FF.sans,
    fontSize: 13,
  };

  const commitRename = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === module.name) {
      setEditingName(false);
      setNameDraft(module.name);
      return;
    }
    setRenaming(true);
    try {
      await onRename(module.name, trimmed);
      setEditingName(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to rename module.");
      setNameDraft(module.name);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 160px 160px 44px",
        padding: "12px",
        borderBottom: `1px solid ${C.border}`,
        alignItems: "center",
        gap: 8,
      }}
    >
      {editingName ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            autoFocus
            value={nameDraft}
            disabled={renaming}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditingName(false); setNameDraft(module.name); }
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={commitRename} disabled={renaming} style={{ ...btnGhost, padding: "6px 10px" }}>
            <Icon d={icons.check} size={13} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.text }}>{module.name}</span>
          <button
            onClick={() => setEditingName(true)}
            title="Rename module"
            style={{ background: "transparent", border: "none", color: C.textFaint, cursor: "pointer", padding: 2, display: "flex" }}
          >
            ✏
          </button>
        </div>
      )}

      <input
        type="number"
        min={module.completed_sessions || 0}
        value={module.planned_sessions}
        onChange={(e) => onPlanChange(module.name, e.target.value)}
        style={inputStyle}
      />
      <div style={{ display: "flex", alignItems: "center", color: C.text, fontFamily: FF.mono }}>
        {module.completed_sessions}
      </div>
      <button
        onClick={async () => {
          if (!canDelete) return;
          if (!confirm(`Delete module "${module.name}"? This can't be undone.`)) return;
          setDeleting(true);
          try {
            await onDelete(module.name);
          } catch (err) {
            console.error(err);
            alert(err.message || "Failed to delete module.");
          } finally {
            setDeleting(false);
          }
        }}
        disabled={!canDelete || deleting}
        title={canDelete ? "Delete module" : "Cannot delete \u2014 sessions/meetings are already classified under it"}
        style={{
          background: "transparent", border: "none", padding: 4, display: "flex", justifyContent: "center",
          color: canDelete ? C.textFaint : C.border, cursor: canDelete && !deleting ? "pointer" : "not-allowed",
        }}
      >
        <Icon d={icons.trash} size={14} />
      </button>
    </div>
  );
}
export default ModuleRow;