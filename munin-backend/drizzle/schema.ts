import { pgTable, text, serial, timestamp, foreignKey, integer, real, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const smes = pgTable("smes", {
	name: text().primaryKey().notNull(),
	role: text().notNull(),
});

export const engagements = pgTable("engagements", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	phase: text().notNull(),
	details: text().default("").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	num: integer().notNull(),
	module: text().notNull(),
	title: text().notNull(),
	date: text().notNull(),
	duration: text().notNull(),
	status: text().notNull(),
	attendees: text().notNull(),
	engagementId: integer("engagement_id"),
	sourceType: text("source_type").default('kt_session').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.engagementId],
			foreignColumns: [engagements.id],
			name: "sessions_engagement_id_fkey"
		}).onDelete("cascade"),
]);

export const transcriptSegments = pgTable("transcript_segments", {
	id: serial().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	seq: integer().notNull(),
	timestamp: text().notNull(),
	speaker: text().notNull(),
	text: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "transcript_segments_session_id_fkey"
		}).onDelete("cascade"),
]);

export const knowledgeObjects = pgTable("knowledge_objects", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	module: text().notNull(),
	description: text().notNull(),
	confidence: real().notNull(),
	needsReview: integer("needs_review").notNull(),
	source: text().notNull(),
	sessionId: text("session_id"),
	segmentTimestamp: text("segment_timestamp"),
	speaker: text(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "knowledge_objects_session_id_fkey"
		}).onDelete("set null"),
]);

export const ktTopics = pgTable("kt_topics", {
	id: serial().primaryKey().notNull(),
	module: text().notNull(),
	topic: text().notNull(),
	depth: integer().notNull(),
});

export const gaps = pgTable("gaps", {
	id: text().primaryKey().notNull(),
	module: text().notNull(),
	question: text().notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const smeContributions = pgTable("sme_contributions", {
	id: serial().primaryKey().notNull(),
	module: text().notNull(),
	name: text().notNull(),
	share: integer().notNull(),
});

export const keyPersonRisk = pgTable("key_person_risk", {
	module: text().primaryKey().notNull(),
});

export const readiness = pgTable("readiness", {
	module: text().primaryKey().notNull(),
	score: integer().notNull(),
});

export const activity = pgTable("activity", {
	id: serial().primaryKey().notNull(),
	text: text().notNull(),
	createdAt: text("created_at").notNull(),
	engagementId: integer("engagement_id"),
}, (table) => [
	foreignKey({
			columns: [table.engagementId],
			foreignColumns: [engagements.id],
			name: "activity_engagement_id_fkey"
		}).onDelete("cascade"),
]);

export const conversations = pgTable("conversations", {
	id: text().primaryKey().notNull(),
	title: text().default('New chat').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	pinned: integer().default(0).notNull(),
	archived: integer().default(0).notNull(),
	engagementId: integer("engagement_id"),
}, (table) => [
	foreignKey({
			columns: [table.engagementId],
			foreignColumns: [engagements.id],
			name: "conversations_engagement_id_fkey"
		}).onDelete("cascade"),
]);

export const chatMessages = pgTable("chat_messages", {
	id: serial().primaryKey().notNull(),
	role: text().notNull(),
	text: text().notNull(),
	citation: text(),
	citationSessionId: text("citation_session_id"),
	citationTimestamp: text("citation_timestamp"),
	isGap: integer("is_gap").default(0).notNull(),
	conversationId: text("conversation_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "chat_messages_conversation_id_fkey"
		}).onDelete("cascade"),
]);

export const modules = pgTable("modules", {
	id: serial().primaryKey().notNull(),
	engagementId: integer("engagement_id"),
	name: text().notNull(),
	plannedSessions: integer("planned_sessions").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.engagementId],
			foreignColumns: [engagements.id],
			name: "modules_engagement_id_fkey"
		}).onDelete("cascade"),
	unique("modules_engagement_id_name_key").on(table.name, table.engagementId),
]);

export const appState = pgTable("app_state", {
	key: text().primaryKey().notNull(),
	value: text(),
});

export const meetings = pgTable("meetings", {
	id: text().primaryKey().notNull(),
	botId: text("bot_id"),
	meetingUrl: text("meeting_url").notNull(),
	botName: text("bot_name").notNull(),
	module: text(),
	status: text().notNull(),
	sessionId: text("session_id"),
	error: text(),
	engagementId: integer("engagement_id"),
	lastExtractedSeq: integer("last_extracted_seq").default(sql`'-1'`).notNull(),
	lastExtractedAt: text("last_extracted_at"),
	meetingTitle: text("meeting_title"),
	participants: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "meetings_session_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.engagementId],
			foreignColumns: [engagements.id],
			name: "meetings_engagement_id_fkey"
		}).onDelete("cascade"),
]);

export const meetingTranscriptChunks = pgTable("meeting_transcript_chunks", {
	id: serial().primaryKey().notNull(),
	botId: text("bot_id").notNull(),
	seq: integer().notNull(),
	speaker: text().notNull(),
	text: text().notNull(),
	timestamp: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
