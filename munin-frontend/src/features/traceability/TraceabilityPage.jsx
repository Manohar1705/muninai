import React, { useEffect, useState } from "react";
import { API_BASE } from "../../shared/api/client";

// Internal-only page — not linked from Sidebar.jsx on purpose. Reachable
// only by navigating to /traceability directly. Shows recent Langfuse
// traces (cost, tokens, latency) for verification, not end-user use.
export default function TraceabilityPage() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadTraces() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/traceability/traces`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load traces");
      setTraces(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTraces();
    // Auto-refresh in the background — no manual button needed. 15s is a
    // reasonable balance: fast enough to feel "live", not so frequent it
    // risks Langfuse's rate limit (15 requests/min on the free tier).
    const interval = setInterval(loadTraces, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h2>LLM Traceability</h2>
      <div style={{ marginBottom: 16, fontSize: 12.5, color: "#888" }}>
        {loading ? "Updating…" : "Auto-refreshing every 15s"}
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Time</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Model</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Cost</th>
 

            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Latency</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Total Tokens</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Duration</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #444", padding: 8 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((t) => (
            <tr key={t.id}>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>{t.name}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>{new Date(t.timestamp).toLocaleString()}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>{t.metadata?.model || "-"}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>${t.totalCost?.toFixed(6) ?? "0"}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>{t.latency}s</td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                {t.name === "transcribe-audio" ? "-" : (t.totalTokens ?? "-")}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                {t.name === "transcribe-audio" && t.totalTokens
                  ? `${Math.floor(t.totalTokens / 60)}m ${t.totalTokens % 60}s`
                  : "-"}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #333" }}>{t.score ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}