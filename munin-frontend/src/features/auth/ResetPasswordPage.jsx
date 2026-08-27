import React, { useState } from "react";
import { C, FF, FONT_IMPORT, IconRaven, Card, Input,PasswordInput, btnPrimary, btnGhost } from "../../shared/components/common";
import { useAuth } from "../../shared/auth/AuthContext";

const MIN_PASSWORD_LENGTH = 8;

// Reached in two situations: a forced reset (Team Setup issued a temp
// password — must_reset_password blocks every other endpoint until this
// succeeds) and a voluntary password change from an already-clean session.
// Both call the same POST /auth/reset-password, which always re-verifies
// currentPassword regardless of which case it is.
function ResetPasswordPage() {
  const { user, mustResetPassword, resetPassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) return setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");

    setSubmitting(true);
    try {
      await resetPassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message?.includes("401") ? "Current password is incorrect." : (err.message || "Password reset failed."));
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: FF.sans, background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{FONT_IMPORT}</style>
      <Card style={{ padding: "36px 34px", width: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div style={{ color: C.amber }}><IconRaven size={26} /></div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Munin</div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          {mustResetPassword ? "Set a new password" : "Change password"}
        </div>
        <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 22 }}>
          {mustResetPassword
            ? `${user?.email || "Your account"} was set up with a temporary password. Choose your own to continue.`
            : "Enter your current password and a new one."}
        </div>

        {success ? (
          <div>
            <div style={{ fontSize: 13, color: C.green, marginBottom: 18 }}>Password updated successfully.</div>
            {!mustResetPassword && (
              <button onClick={() => setSuccess(false)} style={btnGhost}>Done</button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>
                {mustResetPassword ? "Temporary password" : "Current password"}
              </div>
                <PasswordInput autoFocus required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>New password</div>
              <PasswordInput required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Confirm new password</div>
              <PasswordInput required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, justifyContent: "center", marginTop: 6, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 20, textAlign: "center" }}>
          <button onClick={logout} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", fontFamily: FF.sans, fontSize: 12.5, textDecoration: "underline", padding: 0 }}>
            Log out
          </button>
        </div>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
