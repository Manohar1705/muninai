import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Section, C, FF, Icon, icons, ProgressBar, btnPrimary, btnGhost } from "../../shared/components/common";
import { api, invalidateEngagementScopedQueries } from "../../shared/api/client";
import ModuleRow from "./ui/ModuleRow";
import { engagementApi } from "./api";

function EngagementSetupPage({ engagementId }) {
  

  const queryClient = useQueryClient();
  const [engagement, setEngagement] = useState(null);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState([]);
  const [newModule, setNewModule] = useState("");

  const loadModules = () => {
    if (!engagementId) return;
    engagementApi.modules(engagementId).then(setModules);
  };

  useEffect(() => {
    if (!engagementId) return;
    engagementApi.engagements().then((rows) => {
      const found = rows.find((r) => r.id === engagementId);
      if (found) {
        setEngagement(found);
        setName(found.name);
        setDetails(found.details || "");
      }
    });
    loadModules();
  }, [engagementId]);

  const save = async () => {
    if (!engagement) return;
    if (!name.trim()) {
      alert("Engagement name is required.");
      return;
    }

    try {
      setSaving(true);
      const updated = await engagementApi.updateEngagement(engagement.id, name.trim(), details);
      setEngagement(updated);
      setName(updated.name);
      setDetails(updated.details || "");
      invalidateEngagementScopedQueries(queryClient, engagementId);
    } catch (err) {
      console.error(err);
      alert("Failed to save engagement");
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    const trimmed = newModule.trim();
    if (!trimmed) return;

    if (modules.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    try {
      await engagementApi.createModule(trimmed, engagementId);
      setModules((prev) => [...prev, { name: trimmed, planned_sessions: 0, completed_sessions: 0 }]);
      setNewModule("");
      invalidateEngagementScopedQueries(queryClient, engagementId);
    } catch (err) {
      console.error(err);
      alert("Failed to create module");
    }
  };

  const updatePlan = async (moduleName, value) => {
    const next = Number(value || 0);

    setModules((prev) =>
      prev.map((m) => (m.name === moduleName ? { ...m, planned_sessions: next } : m))
    );

    try {
      await engagementApi.updateModulePlan(moduleName, next, engagementId);
      invalidateEngagementScopedQueries(queryClient, engagementId);
    } catch (err) {
      console.error(err);
      alert(err.message || "Planned sessions cannot be less than completed sessions.");
      loadModules();
    }
  };

  const renameModule = async (oldName, newName) => {
    await engagementApi.renameModule(oldName, newName, engagementId);
    setModules((prev) => prev.map((m) => (m.name === oldName ? { ...m, name: newName } : m)));
    invalidateEngagementScopedQueries(queryClient, engagementId);
  };

  const deleteModuleHandler = async (moduleName) => {
    await engagementApi.deleteModule(moduleName, engagementId);
    setModules((prev) => prev.filter((m) => m.name !== moduleName));
    invalidateEngagementScopedQueries(queryClient, engagementId);
  };

  const [deletingEngagement, setDeletingEngagement] = useState(false);
  const deleteEngagementHandler = async () => {
    if (!engagement) return;
    if (!confirm(`Delete engagement "${engagement.name}"? This can't be undone.`)) return;
    setDeletingEngagement(true);
    try {
      await engagementApi.deleteEngagement(engagement.id);
      // Once ["engagements"] refetches without this id, App.jsx's own
      // safety-net effect (currentEngagementId no longer in the list) drops
      // the user back to the Starter page — no extra navigation needed here.
      await queryClient.invalidateQueries({ queryKey: ["engagements"] });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete engagement.");
    } finally {
      setDeletingEngagement(false);
    }
  };

  const inputStyle = {
    background: C.bgRaised,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 7,
    padding: "10px 12px",
    fontFamily: FF.sans,
    fontSize: 13,
  };

  const plannedTotal = modules.reduce((sum, m) => sum + (m.planned_sessions || 0), 0);
  const completedTotal = modules.reduce((sum, m) => sum + (m.completed_sessions || 0), 0);
  const overallCoverage = plannedTotal > 0 ? Math.min(100, Math.round((completedTotal / plannedTotal) * 100)) : 0;

  if (!engagementId) {
    return <div style={{ padding: "26px 32px 48px", color: C.textFaint, fontSize: 13 }}>No engagement selected.</div>;
  }

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title="Engagement Setup">
        <Card style={{ padding: "20px 22px", marginBottom: 20 }}>
          <Section title="Engagement Information">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Engagement name</div>
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Engagement details</div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                />
              </div>
              <div>
                <button onClick={save} disabled={saving} style={btnPrimary}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px", marginBottom: 20 }}>
          <Section title="Coverage pipeline">
            <ProgressBar
              value={overallCoverage}
              label="Sessions covered across all modules"
              sub={`${completedTotal} / ${plannedTotal}`}
            />
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <Section title="Module Planning">
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <input
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                placeholder="Add module..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={addModule} style={btnPrimary}>Add</button>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 160px 44px",
                  padding: "12px",
                  fontWeight: 600,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div>Module</div>
                <div>Planned Sessions</div>
                <div>Completed Sessions</div>
                <div />
              </div>

              {modules.map((module) => (
                <ModuleRow
                  key={module.name}
                  module={module}
                  onRename={renameModule}
                  onPlanChange={updatePlan}
                  onDelete={deleteModuleHandler}
                />
              ))}
            </div>
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px", marginTop: 20, border: `1px solid rgba(196,104,90,0.3)` }}>
          <Section title="Danger zone">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: C.textFaint, maxWidth: 460 }}>
                Permanently delete this engagement and its modules. Only allowed while nothing has been captured yet
                (no sessions or meetings) — once KT starts, this option disappears.
              </div>
              <button
                onClick={deleteEngagementHandler}
                disabled={deletingEngagement}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, background: "transparent",
                  border: "1px solid rgba(196,104,90,0.4)", borderRadius: 7, padding: "9px 16px",
                  fontSize: 13, fontWeight: 500, cursor: deletingEngagement ? "default" : "pointer",
                  fontFamily: FF.sans, color: C.red,
                }}
              >
                <Icon d={icons.trash} size={14} /> {deletingEngagement ? "Deleting…" : "Delete engagement"}
              </button>
            </div>
          </Section>
        </Card>
      </Section>
    </div>
  );
}

export default EngagementSetupPage;