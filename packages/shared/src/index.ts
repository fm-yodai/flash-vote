import { z } from "zod";

export const RoomStatus = ["draft", "published", "live", "ended"] as const;
export type RoomStatus = (typeof RoomStatus)[number];
export const roomStatusSchema = z.enum(RoomStatus);

export const ErrorCode = ["VALIDATION_ERROR", "UNAUTHORIZED", "INTERNAL_ERROR"] as const;
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
