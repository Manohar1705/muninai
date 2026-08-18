import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { C, FF, FONT_IMPORT, IconRaven, Card, Input, btnPrimary, HeroGlow } from "../../shared/components/common";
import { authApi } from "./api";

const EASE = [0.4, 0, 0.2, 1];

// Deliberately never reveals whether the email has an account, and never
// shows a temp password here — see routes/auth.js's forgot-password route
// for why (anyone could otherwise take over any account just by knowing
// their email). The real "I forgot my password" fix today is Team Setup's
// admin-triggered reset, until a real email provider is wired up.
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
    } catch {
      // Intentionally ignored — the response is generic either way, and a
      // network/server error here shouldn't hint at anything either.
    } finally {
      setSubmitted(true);
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
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Forgot password</div>

          {submitted ? (
            <div>
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
                Please contact your team admin to reset your password from Team Setup.
              </div>
              <Link to="/login" style={{ color: C.amber, fontSize: 12.5 }}>Back to login</Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 24 }}>
                Enter your account email to continue.
              </div>
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 6 }}>Email</div>
                  <Input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
                </div>
                <button type="submit" disabled={submitting} style={{ ...btnPrimary, justifyContent: "center", marginTop: 6, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Submitting…" : "Continue"}
                </button>
              </form>
              <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 20, textAlign: "center" }}>
                <Link to="/login" style={{ color: C.amber }}>Back to login</Link>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default ForgotPasswordPage;
