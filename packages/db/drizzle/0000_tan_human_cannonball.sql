CREATE TYPE "public"."audit_actor" AS ENUM('host', 'system');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('not_open', 'accepting', 'closed', 'showing_results');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single_choice', 'multi_choice', 'text');--> statement-breakpoint
CREATE TYPE "public"."response_type" AS ENUM('choice', 'text');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('draft', 'published', 'live', 'ended');--> statement-breakpoint
CREATE TABLE "ai_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"actor" "audit_actor" NOT NULL,
	"action" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"prompt" text NOT NULL,
	"status" "question_status" DEFAULT 'not_open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"type" "response_type" NOT NULL,
	"choice_option_ids" uuid[],
	"text_answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"purpose_text" text,
	"status" "room_status" DEFAULT 'draft' NOT NULL,
	"host_token_hash" text NOT NULL,
	"published_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_proposals_room_version_unique" ON "ai_proposals" USING btree ("room_id","version");--> statement-breakpoint
CREATE INDEX "ai_proposals_room_idx" ON "ai_proposals" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "options_question_order_unique" ON "options" USING btree ("question_id","order");--> statement-breakpoint
CREATE INDEX "options_question_idx" ON "options" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_room_participant_unique" ON "participants" USING btree ("room_id","participant_id");--> statement-breakpoint
CREATE INDEX "participants_room_idx" ON "participants" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_room_order_unique" ON "questions" USING btree ("room_id","order");--> statement-breakpoint
CREATE INDEX "questions_room_idx" ON "questions" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_participant_question_unique" ON "responses" USING btree ("participant_id","question_id");--> statement-breakpoint
CREATE INDEX "responses_room_question_idx" ON "responses" USING btree ("room_id","question_id");