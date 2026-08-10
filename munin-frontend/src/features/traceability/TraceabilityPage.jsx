import React from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "../../shared/api/client";
import { C } from "../../shared/components/common";

// Internal-only page — not linked from Sidebar.jsx on purpose. Reachable
// only by navigating to /traceability directly. Shows recent Langfuse
// traces (cost, tokens, latency) for verification, not end-user use.
export default function TraceabilityPage() {
  const { data, error: queryError } = useQuery({
    queryKey: ["traceability-traces"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/traceability/traces`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load traces");
      return json.data || [];
    },
    // Auto-refresh in the background — no manual button needed. 15s is a
    // reasonable balance: fast enough to feel "live", not so frequent it
    // risks Langfuse's rate limit (15 requests/min on the free tier).
    refetchInterval: 15000,
  });

  const traces = data || [];
  const error = queryError?.message || null;

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h2>LLM Traceability</h2>
     
      {error && <div style={{ color: "red" }}>{error}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Time</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Model</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Cost</th>
 

            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Latency</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Total Tokens</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Duration</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((t) => (
            <tr key={t.id}>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>{t.name}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>{new Date(t.timestamp).toLocaleString()}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>{t.metadata?.model || "-"}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>${t.totalCost?.toFixed(6) ?? "0"}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>{t.latency}s</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>
                {t.name === "transcribe-audio" ? "-" : (t.totalTokens ?? "-")}
              </td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}` }}>
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