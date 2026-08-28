import React, { useState, useEffect, useRef } from "react";

import {
  C,
  Card,
  Section,
  Icon,
  icons,
  btnPrimary,
  btnGhost,
  Input,
  FF,
} from "../../shared/components/common";
import ChatSidebar from "./ui/ChatSidebar";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useChat } from "./hooks/useChat";
import { useNavigate } from "react-router-dom";
import { chatApi } from "./api";
import { useModules } from "../../shared/hooks/useModules";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import jsPDF from "jspdf";
/* ============================== ASK MUNIN (CHAT) ============================== */
// Strips ** markdown markers from text so they never show up literally.
function repairLetterSpacing(text) {
  if (!text) return text;
  return text.replace(
    /(?:\b\w\b[ \t]){3,}\b\w\b/g,
    (match) => match.replace(/[ \t]/g, "")
  );
}

function stripMarkdownBold(text) {
  if (!text) return text;
  return repairLetterSpacing(text)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^\* /gm, "• ");
}

function AskMunin({ engagementId }) {
  const queryClient = useQueryClient();
  const activeConversationKey = `muninActiveConversationId:${engagementId || "none"}`;
  const [activeId, setActiveId] = useState(() => localStorage.getItem(activeConversationKey) || null);
  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [brdOpen, setBrdOpen] = useState(false);
  const [brdLoading, setBrdLoading] = useState(false);
  const [brdText, setBrdText] = useState("");
  const [brdError, setBrdError] = useState("");
  const [brdScope, setBrdScope] = useState(""); // "module:<name>" | "session:<id>"
  const [brdValidationError, setBrdValidationError] = useState("");
  const modules = useModules(engagementId);
  const navigate = useNavigate();

  // Reset the active conversation when the engagement changes
  useEffect(() => {
    setActiveId(localStorage.getItem(activeConversationKey) || null);
  }, [engagementId]);

  const {
    conversations,
    loadingConversations,
    messages,
    loadingHistory,
    setConversations,
    setMessages,
    refreshConversations,
    sendMessage,
    sending,
    handleNewChat,
    handleRenameChat,
    handlePinChat,
    handleArchiveChat,
    handleDeleteChat,
  } = useChat(activeId, setActiveId, engagementId);

  const goToCitation = (citation) => {
    if (!citation || !citation.sessionId) return;

    navigate("/sessions", {
      state: {
        sessionId: citation.sessionId,
        segTime: citation.timestamp || undefined,
      },
    });
  };
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [activeId, messages.length]);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const res = await sendMessage(q);
      if (res.conversationId && res.conversationId !== activeId) setActiveId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", text: res.reply, citation: res.citation, isGap: res.isGap }]);
      if (res.isGap) {
        queryClient.invalidateQueries({
          queryKey: ["coverage"],
        });
      }
      refreshConversations();
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", text: "Sorry — I couldn't reach the backend to answer that. Is it running?", citation: null, isGap: false }]);
    }
  };
const handleGenerateBrd = async () => {
  if (!brdScope) {
    setBrdValidationError("Please select a module first.");
    return;
  }

  setBrdValidationError("");

  setBrdOpen(true);
  setBrdLoading(true);
  setBrdError("");
  setBrdText("");

  const options = {};

  if (brdScope.startsWith("module:")) {
    options.module = brdScope.slice("module:".length);
  } else if (brdScope.startsWith("session:")) {
    options.sessionId = brdScope.slice("session:".length);
  }

  try {
    const res = await chatApi.generateBrd(engagementId, options);
    setBrdText(res.brd);
  } catch (err) {
    console.error(err);
    setBrdError("Failed to generate BRD. Please try again.");
  } finally {
    setBrdLoading(false);
  }
};

const handleDownloadBrd = () => {
    const content = "BUSINESS REQUIREMENT DOCUMENT\n\n" + brdText;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BRD.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Splits the plain BRD text into { heading, lines[] } sections, using our
  // known numbered headings (e.g. "1. OVERVIEW") as section boundaries.
  function parseBrdSections(text) {
    const headingPattern = /^\d+\.\s*[A-Za-z][A-Za-z\s/&\-–—]*:?$/;
    const lines = text.split("\n");
    const sections = [];
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (headingPattern.test(line)) {
        current = { heading: line, lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(line);
      } else {
        current = { heading: "", lines: [line] };
        sections.push(current);
      }
    }
    return sections;
  }

  const handleDownloadWord = async () => {
    const sections = parseBrdSections(brdText);
    const children = [
      new Paragraph({ text: "BUSINESS REQUIREMENT DOCUMENT", heading: HeadingLevel.TITLE }),
    ];

    for (const section of sections) {
      if (section.heading) {
        children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
      }
      for (const line of section.lines) {
        children.push(new Paragraph({ text: stripMarkdownBold(line) }));
      }
    }

    const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: "Arial",
          size: 22,
        },
      },
    },
  },
  sections: [{ children }],
});
    const blob = await Packer.toBlob(doc);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BRD.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

const handleDownloadPdf = () => {
  const sections = parseBrdSections(brdText);

const doc = new jsPDF({
  unit: "pt",
  format: "a4",
});

// Important: force normal character spacing
doc.setCharSpace(0);

const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  let y = margin;

const sanitizeForPdf = (text) =>
  text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2010\u2011\u2012]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

const addLine = (text, size, style) => {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);

  const wrapped = doc.splitTextToSize(sanitizeForPdf(text), maxWidth);

  for (const line of wrapped) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc.text(line, margin, y);

    y += size * 1.4;
  }
};

  addLine("BUSINESS REQUIREMENT DOCUMENT", 18, "bold");
  y += 10;

  for (const section of sections) {
    if (section.heading) {
      y += 8;
      addLine(section.heading, 13, "bold");
    }

    for (const line of section.lines) {
      addLine(stripMarkdownBold(line), 10, "normal");
    }
  }

  doc.save("BRD.pdf");
};


  return (
    <div style={{ padding: "26px 32px 32px", display: "flex", height: "calc(100vh - 130px)" }}>
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
        onPin={handlePinChat}
        onArchive={handleArchiveChat}
        onDelete={handleDeleteChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        loading={loadingConversations}
      />
      <div style={{ flex: 1, marginLeft: 20, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <Section title="Ask Munin" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: C.textFaint }}>Answers are grounded in the knowledge base and always cite a source.</div>
        </Section>

        <Card style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            ref={messagesContainerRef}
            style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
          >
            {loadingHistory && <div style={{ fontSize: 12.5, color: C.textFaint }}>Loading conversation…</div>}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.5,
                  background: m.role === "user" ? C.amberSofter : C.bgRaised,
                  color: m.role === "user" ? C.text : C.textMuted,
                  border: `1px solid ${m.role === "user" ? "rgba(217,164,65,0.3)" : C.border}`,
                }}>
                  {stripMarkdownBold(m.text)}
                </div>
                {m.role === "assistant" && m.citation && (
                  <button onClick={() => goToCitation(m.citation)} style={{ ...btnGhost, marginTop: 6, padding: "5px 10px", fontSize: 11.5 }}>
                    <Icon d={icons.link} size={12} /> {m.citation.sessionTitle || "View source"}
                  </button>
                )}
                {m.role === "assistant" && m.isGap && (
                  <div style={{ marginTop: 6, fontSize: 11, color: C.amber }}>Logged as a coverage gap</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question…"
              disabled={sending}
              style={{ flex: 1, borderRadius: 7, padding: "10px 12px", fontSize: 13.5 }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
                background: input.trim() ? C.amber : C.bgRaised,
                color: input.trim() ? C.textOnAmber : C.textFaint,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <Icon d={icons.send} size={16} />
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "flex-start", marginTop: 10 }}>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <select
              value={brdScope}
              onChange={(e) => {
                setBrdScope(e.target.value);
                setBrdValidationError("");
              }}
              style={{
                background: C.bgRaised,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 12.5,
                fontFamily: FF.sans,
              }}
            >
              <option value="">Select a module</option>
              {modules.map((m) => (
                <option key={m.name} value={`module:${m.name}`}>
                  Module: {m.name}
                </option>
              ))}
            </select>

            {brdValidationError && (
              <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4 }}>
                {brdValidationError}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateBrd}
            style={{
              ...btnPrimary,
              whiteSpace: "nowrap",
              padding: "6px 12px",
              fontSize: 12.5,
            }}
          >
            Generate BRD
          </button>
          </div>
        </Card>
      </div>

      {brdOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 10,
            width: "70%", maxWidth: 800, maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Business Requirement Document</div>
              <button onClick={() => setBrdOpen(false)} style={{ ...btnGhost, padding: "4px 10px" }}>Close</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", fontSize: 13, lineHeight: 1.6, color: C.textMuted, whiteSpace: "pre-wrap" }}>
              {brdLoading && "Generating BRD… this may take a moment."}
              {brdError && <div style={{ color: C.amber }}>{brdError}</div>}
                {!brdLoading && !brdError && stripMarkdownBold(brdText)}
            </div>

             {!brdLoading && !brdError && brdText && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={handleDownloadBrd} style={btnGhost}>
                  .txt
                </button>
                <button onClick={handleDownloadWord} style={btnGhost}>
                  .docx
                </button>
                <button onClick={handleDownloadPdf} style={btnGhost}>
                  .pdf
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default AskMunin;
