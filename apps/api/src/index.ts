import { Hono } from "hono";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { db, rooms } from "@flash-vote/db";
import { createRoomRequestSchema } from "shared";

const app = new Hono();

app.onError((err, c) => {
  const requestId = randomUUID();
  console.error(`[${requestId}]`, err);
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        details: { requestId },
      },
    },
    500
  );
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/host/rooms", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
          details: {},
        },
      },
      400
    );
  }

  const parsed = createRoomRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  const pepper = process.env.HOST_TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("HOST_TOKEN_PEPPER is required");
  }

  const hostToken = randomBytes(32).toString("hex");
  const hostTokenHash = createHash("sha256")
    .update(`${hostToken}${pepper}`)
    .digest("hex");

  const [room] = await db
    .insert(rooms)
    .values({
      title: parsed.data.title ?? null,
      purposeText: parsed.data.purposeText ?? null,
      hostTokenHash,
    })
    .returning({ id: rooms.id, status: rooms.status });

  const webBaseUrl = process.env.WEB_BASE_URL ?? "http://127.0.0.1:5173";
  const hostManagementUrl = new URL(`/host/${room.id}`, webBaseUrl);
  hostManagementUrl.searchParams.set("token", hostToken);
  const publicUrl = new URL(`/r/${room.id}`, webBaseUrl);

  return c.json(
    {
      room: { id: room.id, status: room.status },
      hostToken,
      hostManagementUrl: hostManagementUrl.toString(),
      publicUrl: publicUrl.toString(),
    },
    201
  );
});

export default app;
