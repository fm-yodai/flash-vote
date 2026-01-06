import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { RoomStatus } from "shared";

/**
 * Enums
 */
export const roomStatusEnum = pgEnum("room_status", RoomStatus);

export const questionTypeEnum = pgEnum("question_type", [
  "single_choice",
  "multi_choice",
  "text",
]);

export const questionStatusEnum = pgEnum("question_status", [
  "not_open",
  "accepting",
  "closed",
  "showing_results",
]);

export const responseTypeEnum = pgEnum("response_type", ["choice", "text"]);

export const auditActorEnum = pgEnum("audit_actor", ["host", "system"]);

/**
 * Tables
 */
export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  purposeText: text("purpose_text"),
  status: roomStatusEnum("status").notNull().default("draft"),
  hostTokenHash: text("host_token_hash").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    status: questionStatusEnum("status").notNull().default("not_open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roomOrderUnique: uniqueIndex("questions_room_order_unique").on(t.roomId, t.order),
    roomIdx: index("questions_room_idx").on(t.roomId),
  })
);

export const options = pgTable(
  "options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    questionOrderUnique: uniqueIndex("options_question_order_unique").on(t.questionId, t.order),
    questionIdx: index("options_question_idx").on(t.questionId),
  })
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roomParticipantUnique: uniqueIndex("participants_room_participant_unique").on(
      t.roomId,
      t.participantId
    ),
    roomIdx: index("participants_room_idx").on(t.roomId),
  })
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),

    type: responseTypeEnum("type").notNull(),
    choiceOptionIds: uuid("choice_option_ids").array(),
    textAnswer: text("text_answer"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    participantQuestionUnique: uniqueIndex("responses_participant_question_unique").on(
      t.participantId,
      t.questionId
    ),
    roomQuestionIdx: index("responses_room_question_idx").on(t.roomId, t.questionId),
  })
);

export const aiProposals = pgTable(
  "ai_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    rawJson: jsonb("raw_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roomVersionUnique: uniqueIndex("ai_proposals_room_version_unique").on(t.roomId, t.version),
    roomIdx: index("ai_proposals_room_idx").on(t.roomId),
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  actor: auditActorEnum("actor").notNull(),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
