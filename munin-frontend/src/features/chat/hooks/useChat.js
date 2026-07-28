import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api";



export function useChat(activeId, setActiveId, engagementId) {
  const queryClient = useQueryClient();
  const didPickInitial = useRef(false);
  const [sending, setSending] = useState(false);
  const activeConversationKey = `muninActiveConversationId:${engagementId || "none"}`;
  const {
    data: conversations = [],
    isLoading: loadingConversations,
  } = useQuery({
    queryKey: ["chat-conversations", engagementId],
    queryFn: () => chatApi.listConversations(engagementId),
  });

  const {
    data: messagesRaw,
    isLoading: loadingHistoryQuery,
  } = useQuery({
    queryKey: ["chat-history", activeId],
    queryFn: () => chatApi.chatHistory(activeId),
    enabled: !!activeId,
  });

  const messages = !activeId
    ? []
    : (messagesRaw || []).map((m) => ({
        role: m.role,
        text: m.text,
        citation: m.citation,
        isGap: m.isGap,
      }));

  const loadingHistory = !!activeId && loadingHistoryQuery;

  // Re-run the "pick initial conversation" logic whenever the engagement changes
  useEffect(() => {
    didPickInitial.current = false;
  }, [engagementId]);
  // Runs once, the first time the conversation list arrives — picks the
  // remembered conversation (if it still exists), else the most recent
  // non-archived one, else leaves it empty.
  useEffect(() => {
    if (didPickInitial.current) return;
    if (loadingConversations) return;
    didPickInitial.current = true;

    const remembered = localStorage.getItem(activeConversationKey);
    const stillExists = remembered && conversations.some((c) => c.id === remembered);
    if (stillExists) {
      setActiveId(remembered);
    } else {
      const firstActive = conversations.find((c) => !c.archived) || conversations[0];
      setActiveId(firstActive ? firstActive.id : null);
    }
  }, [loadingConversations, conversations, setActiveId]);

  useEffect(() => {
    if (activeId) localStorage.setItem(activeConversationKey, activeId);
  }, [activeId, activeConversationKey]);

  const setConversations = (updater) =>
    queryClient.setQueryData(["chat-conversations", engagementId], (prev) => updater(prev || []));

  const setMessages = (updater) =>
    queryClient.setQueryData(["chat-history", activeId], (prev) => updater(prev || []));

  const refreshConversations = () =>
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });

  async function sendMessage(text) {
    setSending(true);
    try {
      const res = await chatApi.chat(text, activeId, engagementId);
      return res;
    } finally {
      setSending(false);
    }
  }

  const handleNewChat = async () => {
    try {
      const conv = await chatApi.newConversation(engagementId);
      setConversations((list) => [conv, ...list]);
      setActiveId(conv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameChat = async (id, title) => {
    try {
      await chatApi.renameConversation(id, title);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't rename that chat — is the backend running?");
    }
  };

  const handlePinChat = async (id, pinned) => {
    try {
      await chatApi.pinConversation(id, pinned);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, pinned } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't pin that chat — is the backend running?");
    }
  };

  const handleArchiveChat = async (id, archived) => {
    try {
      await chatApi.archiveConversation(id, archived);
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, archived } : c)));
    } catch (err) {
      console.error(err);
      alert("Couldn't archive that chat — is the backend running?");
    }
  };

  const handleDeleteChat = async (id) => {
    if (!confirm("Delete this chat? This can't be undone.")) return;
    try {
      await chatApi.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(() => remaining);
      if (id === activeId) {
        const nextActive = remaining.find((c) => !c.archived);
        if (nextActive) {
          setActiveId(nextActive.id);
        } else {
          setActiveId(null);
          localStorage.removeItem(activeConversationKey);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that chat — is the backend running?");
    }
  };

  return {
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
  };
}