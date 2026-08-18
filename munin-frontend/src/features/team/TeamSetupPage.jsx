import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Section, C, FF, Input, btnPrimary, btnGhost, Pill } from "../../shared/components/common";
import { useToast } from "../../shared/components/Toast";
import { teamApi } from "./api";

const ROLES = ["admin", "user"];

// Only shown once, right after an invite creates a brand new account — the
// backend never stores or returns it again (only its hash is kept), so
// losing this banner means generating a fresh temp password some other way.
function TempPasswordBanner({ email, tempPassword, onDismiss }) {
  return (
    <div style={{
      background: C.amberSofter, border: "1px solid rgba(217,164,65,0.3)", borderRadius: 8,
      padding: "12px 14px", marginBottom: 18, fontSize: 12.5, color: C.text,
    }}>
      <div style={{ marginBottom: 6 }}>
        Temporary password for <strong>{email}</strong>. Share it securely — it will not be shown again:
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <code style={{ fontFamily: FF.mono, fontSize: 13, background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 9px" }}>
          {tempPassword}
        </code>
        <button onClick={onDismiss} style={{ ...btnGhost, padding: "4px 10px", fontSize: 12 }}>Dismiss</button>
      </div>
    </div>
  );
}

function TeamSetupPage({ engagementId }) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [created, setCreated] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team", engagementId],
    queryFn: () => teamApi.members(engagementId),
    enabled: Boolean(engagementId),
  });

  const invite = useMutation({
    mutationFn: () => teamApi.invite(engagementId, email.trim(), role),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["team", engagementId] });
      setCreated(res.tempPassword ? { email: res.email, tempPassword: res.tempPassword } : null);
      setEmail("");
      setRole("user");
      showToast(`${res.email} added to this engagement.`, "success");
    },
    onError: (err) => showToast(err.message || "Failed to invite member.", "error"),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, newRole }) => teamApi.updateRole(engagementId, userId, newRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team", engagementId] }),
    onError: (err) => showToast(err.message || "Failed to update role.", "error"),
  });

  const removeMember = useMutation({
    mutationFn: (userId) => teamApi.removeMember(engagementId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team", engagementId] }),
    onError: (err) => showToast(err.message || "Failed to remove member.", "error"),
  });

  // The practical "I forgot my password" fix today: an admin regenerates a
  // temp password here and shares it with the member out-of-band. Safe to
  // show in the response since the caller is already an authenticated admin.
  const resetPassword = useMutation({
    mutationFn: (userId) => teamApi.resetMemberPassword(engagementId, userId),
    onSuccess: (res) => {
      setCreated({ email: res.email, tempPassword: res.tempPassword });
      showToast(`Temporary password generated for ${res.email}.`, "success");
    },
    onError: (err) => showToast(err.message || "Failed to reset password.", "error"),
  });

  if (!engagementId) {
    return <div style={{ padding: "26px 32px 48px", color: C.textFaint, fontSize: 13 }}>No engagement selected.</div>;
  }

  return (
    <div style={{ padding: "26px 32px 48px" }}>
      <Section title="Team Setup">
        {created && (
          <TempPasswordBanner email={created.email} tempPassword={created.tempPassword} onDismiss={() => setCreated(null)} />
        )}

        <Card style={{ padding: "20px 22px", marginBottom: 20 }}>
          <Section title="Invite a teammate">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Email</div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%" }}
                  placeholder="teammate@company.com"
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Role</div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 13, fontFamily: FF.sans }}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button
                onClick={() => invite.mutate()}
                disabled={invite.isPending || !email.trim()}
                style={{ ...btnPrimary, opacity: invite.isPending || !email.trim() ? 0.7 : 1 }}
              >
                {invite.isPending ? "Adding…" : "Add to engagement"}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 10 }}>
              If this email doesn't have an account yet, one is created with a temporary password and a forced reset on first login.
            </div>
          </Section>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <Section title="Members">
            {isLoading && <div style={{ fontSize: 13, color: C.textFaint }}>Loading members…</div>}
            {!isLoading && members.length === 0 && <div style={{ fontSize: 13, color: C.textFaint }}>No one has been added to this engagement yet.</div>}
            {!isLoading && members.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {members.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 7,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
                      {m.is_owner && <Pill tone="amber">Owner</Pill>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        value={m.role}
                        disabled={m.is_owner || updateRole.isPending}
                        onChange={(e) => updateRole.mutate({ userId: m.id, newRole: e.target.value })}
                        style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 12.5, fontFamily: FF.sans }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {!m.is_owner && (
                        <button
                          onClick={() => resetPassword.mutate(m.id)}
                          disabled={resetPassword.isPending}
                          title="Generate a new temporary password for this member"
                          style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                        >
                          Reset password
                        </button>
                      )}
                      {!m.is_owner && (
                        <button
                          onClick={() => removeMember.mutate(m.id)}
                          disabled={removeMember.isPending}
                          style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </Card>
      </Section>
    </div>
  );
}

export default TeamSetupPage;
