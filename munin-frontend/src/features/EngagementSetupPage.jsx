import React, { useEffect, useState } from "react";
import { Card, Section, C, btnPrimary } from "../components/common";
import { api } from "../api";

function EngagementSetupPage() {
  const [engagement, setEngagement] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState([]);
  const [newModule, setNewModule] = useState("");
  useEffect(() => {
    api.engagements().then((rows) => {
      if (rows.length) {
        setEngagement(rows[0]);
        setName(rows[0].name);
      }
    });
    api.modules().then((rows) => {
        setModules(rows);
    });
  }, []);

  const save = async () => {
    if (!engagement) return;

    try {
      setSaving(true);

      const updated = await api.updateEngagement(
        engagement.id,
        name
      );

      setEngagement(updated);
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

    if (
        modules.some(
        (m) =>
            m.name.toLowerCase() ===
            trimmed.toLowerCase()
        )
    ) {
        return;
    }

    try {
        await api.createModule(trimmed);

        setModules((prev) => [
        ...prev,
        {
            name: trimmed,
            planned_sessions: 0,
        },
        ]);

        setNewModule("");
    } catch (err) {
        console.error(err);
        alert("Failed to create module");
    }
    };
    const updatePlan = async (
        moduleName,
        value
        ) => {
        const next = Number(value || 0);

        setModules((prev) =>
            prev.map((m) =>
            m.name === moduleName
                ? {
                    ...m,
                    planned_sessions: next,
                }
                : m
            )
        );

        try {
            await api.updateModulePlan(
            moduleName,
            next
            );
        } catch (err) {
            console.error(err);

            alert(
                "Planned sessions cannot be less than completed sessions."
            );

            api.modules().then((rows) => {
                setModules(rows);
            });
            }
    };
return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title="Engagement Setup">
        <Card style={{ padding: "20px 22px", marginBottom: 20 }}>
          <Section title="Engagement Information">
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  flex: 1,
                  background: C.bgRaised,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  borderRadius: 7,
                  padding: "10px 12px",
                }}
              />

              <button
                onClick={save}
                disabled={saving}
                style={btnPrimary}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px" }}>

            <Section title="Module Planning">

                <div
                style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 18,
                }}
                >
                <input
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    placeholder="Add module..."
                    style={{
                    flex: 1,
                    background: C.bgRaised,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    borderRadius: 7,
                    padding: "10px 12px",
                    }}
                />

                <button
                    onClick={addModule}
                    style={btnPrimary}
                >
                    Add
                </button>
                </div>

                <div
                style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                }}
                >
                <div
                    style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 180px 180px",
                    padding: "12px",
                    fontWeight: 600,
                    borderBottom: `1px solid ${C.border}`,
                    }}
                >
                    <div>Module</div>
                    <div>Planned Sessions</div>
                    <div>Completed Sessions</div>
                </div>

                {modules.map((module) => (
                    <div
                    key={module.name}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 180px 180px",
                        padding: "12px",
                        borderBottom: `1px solid ${C.border}`,
                    }}
                    >
                    <div>{module.name}</div>

                    <input
                        type="number"
                        min="0"
                        value={module.planned_sessions}
                        onChange={(e) =>
                            updatePlan(
                            module.name,
                            e.target.value
                            )
                        }
                        style={{
                        background: C.bgRaised,
                        border: `1px solid ${C.border}`,
                        color: C.text,
                        borderRadius: 6,
                        padding: "6px 8px",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            color: C.text,
                            fontFamily: "monospace",
                        }}
                        >
                        {module.completed_sessions}
                    </div>

                    </div>
                ))}
                </div>
            </Section>
            </Card>
      </Section>
    </div>
  );
}

export default EngagementSetupPage;