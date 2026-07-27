import {
  apiRequest,
  apiRequestSoft,
} from "../../shared/api/client";
export function normalizeMeeting(m) {
  if (!m) return m;
  return {
    id: m.id,
    botId: m.botId ?? m.bot_id ?? null,
    meetingUrl: m.meetingUrl ?? m.meeting_url ?? "",
    botName: m.botName ?? m.bot_name ?? "Munin",
    meetingTitle: m.meetingTitle ?? m.meeting_title ?? null,
    status: m.status,
    sessionId: m.sessionId ?? m.session_id ?? null,
    module: m.module ?? null,
    warning: m.warning ?? null,
    error: m.error ?? null,
    createdAt: m.createdAt ?? m.created_at ?? null,
    participants: m.participants ? JSON.parse(m.participants) : [],
    durationSeconds: m.durationSeconds ?? null,
  };
}
export const meetingsApi = {
  getMeetings: (engagementId) =>
    apiRequest(
      `/meetings?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`
    ),

  updateMeetingModule: (id, module) =>
    apiRequest(`/meetings/${id}/module`, {
      method: "PATCH",
      body: JSON.stringify({ module }),
    }),

  joinMeeting: (
    meetingUrl,
    botName,
    meetingTitle,
    engagementId
  ) =>
    apiRequestSoft("/meetings/join", {
      method: "POST",
      body: JSON.stringify({
        meetingUrl,
        botName,
        meetingTitle,
        engagementId,
      }),
    }),

  meetingStatus: (id) =>
    apiRequestSoft(`/meetings/${id}/status`),

  leaveMeeting: (id) =>
    apiRequestSoft(`/meetings/${id}/leave`, {
      method: "POST",
    }),

  deleteMeeting: (id) =>
    apiRequest(`/meetings/${id}`, {
      method: "DELETE",
    }),
};