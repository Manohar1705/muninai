import { relations } from "drizzle-orm/relations";
import { engagements, sessions, transcriptSegments, knowledgeObjects, activity, conversations, chatMessages, modules, meetings } from "./schema";

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	engagement: one(engagements, {
		fields: [sessions.engagementId],
		references: [engagements.id]
	}),
	transcriptSegments: many(transcriptSegments),
	knowledgeObjects: many(knowledgeObjects),
	meetings: many(meetings),
}));

export const engagementsRelations = relations(engagements, ({many}) => ({
	sessions: many(sessions),
	activities: many(activity),
	conversations: many(conversations),
	modules: many(modules),
	meetings: many(meetings),
}));

export const transcriptSegmentsRelations = relations(transcriptSegments, ({one}) => ({
	session: one(sessions, {
		fields: [transcriptSegments.sessionId],
		references: [sessions.id]
	}),
}));

export const knowledgeObjectsRelations = relations(knowledgeObjects, ({one}) => ({
	session: one(sessions, {
		fields: [knowledgeObjects.sessionId],
		references: [sessions.id]
	}),
}));

export const activityRelations = relations(activity, ({one}) => ({
	engagement: one(engagements, {
		fields: [activity.engagementId],
		references: [engagements.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	engagement: one(engagements, {
		fields: [conversations.engagementId],
		references: [engagements.id]
	}),
	chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	conversation: one(conversations, {
		fields: [chatMessages.conversationId],
		references: [conversations.id]
	}),
}));

export const modulesRelations = relations(modules, ({one}) => ({
	engagement: one(engagements, {
		fields: [modules.engagementId],
		references: [engagements.id]
	}),
}));

export const meetingsRelations = relations(meetings, ({one}) => ({
	session: one(sessions, {
		fields: [meetings.sessionId],
		references: [sessions.id]
	}),
	engagement: one(engagements, {
		fields: [meetings.engagementId],
		references: [engagements.id]
	}),
}));