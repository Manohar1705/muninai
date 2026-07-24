import {
  apiRequest,
  apiRequestSoft,
} from "../../shared/api/client";

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
};