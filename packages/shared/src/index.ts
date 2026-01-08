import { z } from "zod";

export const RoomStatus = ["draft", "published", "live", "ended"] as const;
export type RoomStatus = (typeof RoomStatus)[number];
export const roomStatusSchema = z.enum(RoomStatus);

export const QuestionType = ["single_choice", "multi_choice", "text"] as const;
export type QuestionType = (typeof QuestionType)[number];
export const questionTypeSchema = z.enum(QuestionType);

export const QuestionStatus = [
  "not_open",
  "accepting",
  "closed",
  "showing_results",
] as const;
export type QuestionStatus = (typeof QuestionStatus)[number];
export const questionStatusSchema = z.enum(QuestionStatus);

export const ErrorCode = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ErrorCode)[number];
export const errorCodeSchema = z.enum(ErrorCode);

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).default({}),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const createRoomRequestSchema = z.object({
  title: z.string().max(100).optional(),
  purposeText: z.string().optional(),
});
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;

export const createRoomResponseSchema = z.object({
  room: z.object({
    id: z.string().uuid(),
    status: roomStatusSchema,
  }),
  hostToken: z.string(),
  hostManagementUrl: z.string().url(),
  publicUrl: z.string().url(),
});
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;

export const updateRoomRequestSchema = z.object({
  title: z.string().max(100).optional(),
  purposeText: z.string().optional(),
});
export type UpdateRoomRequest = z.infer<typeof updateRoomRequestSchema>;

export const optionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().max(60),
  order: z.number().int().min(0),
});
export type Option = z.infer<typeof optionSchema>;

export const questionSchema = z.object({
  id: z.string().uuid(),
  type: questionTypeSchema,
  prompt: z.string().max(200),
  order: z.number().int().min(0),
  status: questionStatusSchema,
  options: z.array(optionSchema),
});
export type Question = z.infer<typeof questionSchema>;

export const hostRoomSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  purposeText: z.string().nullable(),
  status: roomStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  currentQuestionIndex: z.number().int().min(0),
});
export type HostRoom = z.infer<typeof hostRoomSchema>;

export const hostRoomDetailResponseSchema = z.object({
  room: hostRoomSchema,
  questions: z.array(questionSchema),
  guestCount: z.object({
    active: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
});
export type HostRoomDetailResponse = z.infer<typeof hostRoomDetailResponseSchema>;

export const createQuestionRequestSchema = z
  .object({
    type: questionTypeSchema,
    prompt: z.string().max(200),
    options: z.array(z.string().max(60)).optional(),
  })
  .superRefine((value, ctx) => {
    const isChoice = value.type !== "text";
    if (isChoice && (!value.options || value.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Options are required for choice questions",
        path: ["options"],
      });
    }
    if (!isChoice && value.options && value.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Options are not allowed for text questions",
        path: ["options"],
      });
    }
  });
export type CreateQuestionRequest = z.infer<typeof createQuestionRequestSchema>;

export const updateQuestionRequestSchema = z.object({
  prompt: z.string().max(200).optional(),
  options: z.array(z.string().max(60)).optional(),
  order: z.number().int().min(0).optional(),
});
export type UpdateQuestionRequest = z.infer<typeof updateQuestionRequestSchema>;
