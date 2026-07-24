import { apiRequest } from "../../shared/api/client";

export const chatApi = {
  listConversations: () =>
    apiRequest("/chat/conversations"),

  newConversation: () =>
    apiRequest("/chat/conversations", {
      method: "POST",
    }),

  renameConversation: (id, title) =>
    apiRequest(`/chat/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  pinConversation: (id, pinned) =>
    apiRequest(`/chat/conversations/${id}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    }),

  archiveConversation: (id, archived) =>
    apiRequest(`/chat/conversations/${id}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ archived }),
    }),

  deleteConversation: (id) =>
    apiRequest(`/chat/conversations/${id}`, {
      method: "DELETE",
    }),

  chatHistory: (conversationId) =>
    apiRequest(
      `/chat/history?conversationId=${encodeURIComponent(
        conversationId || ""
      )}`
    ),

  chat: (message, conversationId) =>
    apiRequest("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        conversationId,
      }),
    }),
};