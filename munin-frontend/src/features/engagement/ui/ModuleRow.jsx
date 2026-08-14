import React, { useEffect, useState } from "react";

import {
  C,
  FF,
  Icon,
  icons,
  btnGhost,
  Input,
} from "../../../shared/components/common";
import { getPlanValidationError } from "../modulePlanning";
import { useToast } from "../../../shared/components/Toast";

// Modules are the source of truth for session classification: every KT
// session and meeting is filed under exactly one of the modules defined
// here (or "Unclassified"), and Munin never invents a module name on its
// own — it only ever picks among what's defined on this page.
function ModuleRow({ module, onRename, onPlanChange, onDelete }) {
  const showToast = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(module.name);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [planDraft, setPlanDraft] = useState(String(module.planned_sessions ?? 0));
  const [planError, setPlanError] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const canDelete = !module.completed_sessions;
  const planErrorId = `module-plan-error-${module.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  useEffect(() => { setNameDraft(module.name); }, [module.name]);
  useEffect(() => {
    setPlanDraft(String(module.planned_sessions ?? 0));
    setPlanError(null);
  }, [module.planned_sessions]);


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
      showToast(err.message || "Failed to rename module.");
      setNameDraft(module.name);
    } finally {
      setRenaming(false);
    }
  };

  const updatePlanDraft = (value) => {
    setPlanDraft(value);
    setPlanError(getPlanValidationError(value, module.completed_sessions));
  };

  const commitPlan = async () => {
    const error = getPlanValidationError(planDraft, module.completed_sessions);
    if (error) {
      setPlanError(error);
      return;
    }

    const next = Number(planDraft);
    if (next === Number(module.planned_sessions || 0)) return;

    setSavingPlan(true);
    setPlanError(null);
    try {
      await onPlanChange(module.name, next);
    } catch (err) {
      console.error(err);
      setPlanError(err.message || "Failed to update planned sessions.");
    } finally {
      setSavingPlan(false);
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
          <Input
            autoFocus
            value={nameDraft}
            disabled={renaming}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditingName(false); setNameDraft(module.name); }
            }}
            style={{ padding: "6px 8px", flex: 1 }}
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

      <div>
        <Input
          type="number"
          min={module.completed_sessions || 0}
          step="1"
          value={planDraft}
          disabled={savingPlan}
          aria-invalid={Boolean(planError)}
          aria-describedby={planError ? planErrorId : undefined}
          onChange={(e) => updatePlanDraft(e.target.value)}
          onBlur={commitPlan}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setPlanDraft(String(module.planned_sessions ?? 0));
              setPlanError(null);
            }
          }}
          style={{
            padding: "6px 8px",
            width: "100%",
            borderColor: planError ? C.red : C.border,
            background: planError ? "rgba(196,104,90,0.08)" : C.bgRaised,
          }}
        />
        {planError && (
          <div
            id={planErrorId}
            role="alert"
            style={{
              color: C.red,
              fontSize: 10.5,
              lineHeight: 1.35,
              marginTop: 5,
            }}
          >
            {planError}
          </div>
        )}
      </div>
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
            showToast(err.message || "Failed to delete module.");
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
