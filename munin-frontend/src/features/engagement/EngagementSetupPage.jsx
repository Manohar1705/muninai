import React, { useEffect, useState } from "react";
import { Card, Section, C, FF, Icon, icons, ProgressBar, btnPrimary, btnGhost, Input } from "../../shared/components/common";
import ModuleRow from "./ui/ModuleRow";
import { useEngagementSetup } from "./hooks/useEngagementSetup";

function EngagementSetupPage({ engagementId }) {
  const {
    engagement, modules, saving, deletingEngagement,
    save, addModule, updatePlan, renameModule,
    deleteModuleHandler, deleteEngagementHandler,
  } = useEngagementSetup(engagementId);

  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [newModule, setNewModule] = useState("");

  useEffect(() => {
    if (engagement) {
      setName(engagement.name);
      setDetails(engagement.details || "");
    }
  }, [engagement]);

  const handleSave = () => save(name, details);
  const handleAddModule = () => { addModule(newModule); setNewModule(""); };
  



  const textareaStyle = {
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
                <Input value={name} onChange={(e) => setName(e.target.value)} style={{ borderRadius: 7, padding: "10px 12px", width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Engagement details</div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  style={{ ...textareaStyle, width: "100%", resize: "vertical" }}
                />
              </div>
              <div>
                <button onClick={handleSave} disabled={saving} style={btnPrimary}>
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
              <Input
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                placeholder="Add module..."
                style={{ borderRadius: 7, padding: "10px 12px", flex: 1 }}
              />
              <button onClick={handleAddModule} style={btnPrimary}>Add</button>
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