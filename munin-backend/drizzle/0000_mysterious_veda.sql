-- Initial schema. The existing RDS database was baselined before this file was
-- uncommented, so it will skip migration 0000. A fresh database will run it.
CREATE TABLE "smes" (
	"name" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phase" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"num" integer NOT NULL,
	"module" text NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"duration" text NOT NULL,
	"status" text NOT NULL,
	"attendees" text NOT NULL,
	"engagement_id" integer,
	"source_type" text DEFAULT 'kt_session' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"seq" integer NOT NULL,
	"timestamp" text NOT NULL,
	"speaker" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"module" text NOT NULL,
	"description" text NOT NULL,
	"confidence" real NOT NULL,
	"needs_review" integer NOT NULL,
	"source" text NOT NULL,
	"session_id" text,
	"segment_timestamp" text,
	"speaker" text
);
--> statement-breakpoint
CREATE TABLE "kt_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"topic" text NOT NULL,
	"depth" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gaps" (
	"id" text PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"question" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sme_contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"name" text NOT NULL,
	"share" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_person_risk" (
	"module" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readiness" (
	"module" text PRIMARY KEY NOT NULL,
	"score" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"created_at" text NOT NULL,
	"engagement_id" integer
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pinned" integer DEFAULT 0 NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"engagement_id" integer
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"citation" text,
	"citation_session_id" text,
	"citation_timestamp" text,
	"is_gap" integer DEFAULT 0 NOT NULL,
	"conversation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"engagement_id" integer,
	"name" text NOT NULL,
	"planned_sessions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_engagement_id_name_key" UNIQUE("name","engagement_id")
);
--> statement-breakpoint
CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_id" text,
	"meeting_url" text NOT NULL,
	"bot_name" text NOT NULL,
	"module" text,
	"status" text NOT NULL,
	"session_id" text,
	"error" text,
	"engagement_id" integer,
	"last_extracted_seq" integer DEFAULT '-1' NOT NULL,
	"last_extracted_at" text,
	"meeting_title" text,
	"participants" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_transcript_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"seq" integer NOT NULL,
	"speaker" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_objects" ADD CONSTRAINT "knowledge_objects_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;
