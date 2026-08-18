import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getToken, setToken } from "../api/client";
import { authApi } from "../../features/auth/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken);
  const [user, setUser] = useState(null);
  // Covers the initial /me check (and any re-check after a token change) so
  // App doesn't flash the login screen before we know a stored token is
  // still valid.
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const applySession = useCallback((session) => {
    setToken(session.token);
    setTokenState(session.token);
    setUser(session.user);
  }, []);

  // The API client dispatches this the moment any request comes back 401
  // (token missing/invalid/expired), so the whole app falls back to the
  // login screen immediately instead of every feature handling it itself.
  useEffect(() => {
    window.addEventListener("munin:auth:unauthorized", logout);
    return () => window.removeEventListener("munin:auth:unauthorized", logout);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    authApi.me()
      .then((res) => { if (!cancelled) setUser(res.user); })
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const session = await authApi.login(email, password);
    applySession(session);
    return session;
  }, [applySession]);

  const register = useCallback(async (teamName, email, password) => {
    const session = await authApi.register(teamName, email, password);
    applySession(session);
    return session;
  }, [applySession]);

  const resetPassword = useCallback(async (currentPassword, newPassword) => {
    await authApi.resetPassword(currentPassword, newPassword);
    setUser((prev) => (prev ? { ...prev, mustResetPassword: false } : prev));
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(token && user),
    mustResetPassword: Boolean(user?.mustResetPassword),
    loading,
    login,
    register,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
