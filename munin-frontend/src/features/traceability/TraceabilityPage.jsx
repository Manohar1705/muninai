import React from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "../../shared/api/client";
import { C, FF, Section, Card } from "../../shared/components/common";

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
    <div style={{ padding: "26px 32px 48px", fontFamily: FF.sans }}>
      <Section title="LLM Insights">
      {error && <div style={{ color: C.red, marginBottom: 12 }}>{error}</div>}
      <Card style={{ padding: 16, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF.sans }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Date & Time</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Model</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Cost</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Latency</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Total Tokens</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Duration</th>
            <th style={{ textAlign: "left", borderBottom: `1px solid ${C.borderTable}`, padding: 8, color: C.textMuted, fontSize: 13, fontWeight: 500 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((t) => (
            <tr key={t.id}>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>{t.name}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>{new Date(t.timestamp).toLocaleString()}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>{t.metadata?.model || "-"}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>${t.totalCost?.toFixed(6) ?? "0"}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>{t.latency}s</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>
                {t.name === "transcribe-audio" ? "-" : (t.totalTokens ?? "-")}
              </td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>
                {t.name === "transcribe-audio" && t.totalTokens
                  ? `${Math.floor(t.totalTokens / 60)}m ${t.totalTokens % 60}s`
                  : "-"}
              </td>
              <td style={{ padding: 8, borderBottom: `1px solid ${C.borderTableSoft}`, color: C.text, fontSize: 13.5 }}>{t.score ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
    </Section>      
    </div>
  );
}