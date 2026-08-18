import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { C, FF, FONT_IMPORT, IconRaven, Card, Input, btnPrimary, HeroGlow } from "../../shared/components/common";
import { useAuth } from "../../shared/auth/AuthContext";

const EASE = [0.4, 0, 0.2, 1];

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message?.includes("401") ? "Invalid email or password." : (err.message || "Login failed."));
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
        <Card style={{ padding: "38px 36px", width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ color: C.amber }}><IconRaven size={30} /></div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>Munin</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Log in</div>
          <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 24 }}>Access your team's engagements.</div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Email</div>
              <Input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>Password</span>
                <Link to="/forgot-password" style={{ color: C.textFaint, fontSize: 11.5 }}>Forgot password?</Link>
              </div>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, justifyContent: "center", marginTop: 6, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>
          <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 20, textAlign: "center" }}>
            New to Munin? <Link to="/register" style={{ color: C.amber }}>Create a team</Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default LoginPage;

