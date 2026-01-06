export const RoomStatus = ["draft", "published", "live", "ended"] as const;
export type RoomStatus = (typeof RoomStatus)[number];
