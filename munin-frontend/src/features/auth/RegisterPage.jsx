import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { C, FF, FONT_IMPORT, IconRaven, Card, Input, PasswordInput, btnPrimary, HeroGlow } from "../../shared/components/common";
import { useAuth } from "../../shared/auth/AuthContext";

const EASE = [0.4, 0, 0.2, 1];
const MIN_PASSWORD_LENGTH = 8;

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) return setError("Team name is required.");
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      await register(teamName.trim(), email.trim(), password);
      // Team created, but not logged in — send them to the real login
      // step with the email prefilled and a confirmation message.
      navigate("/login", {
        replace: true,
        state: { prefillEmail: email.trim(), justRegistered: true },
      });
    } catch (err) {
      setError(err.message?.includes("409") ? "An account with this email already exists." : (err.message || "Registration failed."));
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "relative", fontFamily: FF.sans, background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <style>{FONT_IMPORT}</style>
      <HeroGlow />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        style={{ position: "relative", zIndex: 1 }}
      >
        <Card style={{ padding: "38px 36px", width: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ color: C.amber }}><IconRaven size={30} /></div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>Munin</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Create your team</div>
          <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 24 }}>
            You'll be the team owner and the first admin — add teammates later from Team Setup.
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Team name</div>
              <Input autoFocus required value={teamName} onChange={(e) => setTeamName(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Email</div>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Password</div>
                <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Confirm password</div>
              <PasswordInput required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, justifyContent: "center", marginTop: 6, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Creating…" : "Create team"}
            </button>
          </form>
          <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 20, textAlign: "center" }}>
            Already have an account? <Link to="/login" style={{ color: C.amber }}>Log in</Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default RegisterPage;

