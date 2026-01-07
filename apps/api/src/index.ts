import { Hono, type Context } from "hono";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  auditLogs,
  db,
  options,
  participants,
  questions,
  rooms,
} from "@flash-vote/db";
import {
  createQuestionRequestSchema,
  createRoomRequestSchema,
  updateQuestionRequestSchema,
  updateRoomRequestSchema,
} from "shared";
import { eq, inArray, sql } from "drizzle-orm";

const app = new Hono();

const jsonError = (
  c: Context,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
) =>
  c.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    status
  );

const requirePepper = () => {
  const pepper = process.env.HOST_TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("HOST_TOKEN_PEPPER is required");
  }
  return pepper;
};

const hashHostToken = (token: string, pepper: string) =>
  createHmac("sha256", pepper).update(token).digest("hex");

const getBearerToken = (authHeader?: string | null) => {
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
};

const authorizeRoom = async (c: Context, roomId: string) => {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return {
      ok: false as const,
      response: jsonError(c, 401, "UNAUTHORIZED", "Missing host token"),
    };
  }

  const room = await db
    .select({
      id: rooms.id,
      title: rooms.title,
      purposeText: rooms.purposeText,
      status: rooms.status,
      hostTokenHash: rooms.hostTokenHash,
      publishedAt: rooms.publishedAt,
      endedAt: rooms.endedAt,
      currentQuestionIndex: rooms.currentQuestionIndex,
    })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!room) {
    return {
      ok: false as const,
      response: jsonError(c, 404, "NOT_FOUND", "Room not found"),
    };
  }

  const pepper = requirePepper();
  const hashed = hashHostToken(token, pepper);
  const tokenMatches =
    room.hostTokenHash.length === hashed.length &&
    timingSafeEqual(
      Buffer.from(room.hostTokenHash, "hex"),
      Buffer.from(hashed, "hex")
    );

  if (!tokenMatches) {
    return {
      ok: false as const,
      response: jsonError(c, 401, "UNAUTHORIZED", "Invalid host token"),
    };
  }

  return { ok: true as const, room };
};

const authorizeQuestion = async (c: Context, questionId: string) => {
  const question = await db
    .select({
      id: questions.id,
      roomId: questions.roomId,
      type: questions.type,
      prompt: questions.prompt,
      order: questions.order,
      status: questions.status,
    })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!question) {
    return {
      ok: false as const,
      response: jsonError(c, 404, "NOT_FOUND", "Question not found"),
    };
  }

  const auth = await authorizeRoom(c, question.roomId);
  if (!auth.ok) {
    return auth;
  }

  return { ok: true as const, room: auth.room, question };
};

const parseJsonBody = async (c: Context) => {
  try {
    return { ok: true as const, body: await c.req.json() };
  } catch {
    return {
      ok: false as const,
      response: jsonError(c, 400, "VALIDATION_ERROR", "Invalid JSON body"),
    };
  }
};

app.use("*", async (c, next) => {
  const requestId = randomUUID();
  const start = Date.now();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  try {
    await next();
  } finally {
    const url = new URL(c.req.url);
    const status = c.res.status;
    const length = c.res.headers.get("content-length") ?? "-";
    const durationMs = Date.now() - start;
    console.log(
      `[${requestId}] ${c.req.method} ${url.pathname}${url.search} -> ${status} ${durationMs}ms ${length}`
    );
  }
});

app.onError((err, c) => {
  const requestId = c.get("requestId") ?? randomUUID();
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
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = createRoomRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(c, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  }

  const pepper = requirePepper();
  const hostToken = randomBytes(32).toString("hex");
  const hostTokenHash = hashHostToken(hostToken, pepper);

  const [room] = await db
    .insert(rooms)
    .values({
      title: parsed.data.title ?? null,
      purposeText: parsed.data.purposeText ?? null,
      hostTokenHash,
    })
    .returning({ id: rooms.id, status: rooms.status });

  const webBaseUrl = process.env.WEB_BASE_URL ?? "http://127.0.0.1:4173";
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

app.get("/api/host/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const auth = await authorizeRoom(c, roomId);
  if (!auth.ok) {
    return auth.response;
  }

  const questionRows = await db
    .select({
      id: questions.id,
      type: questions.type,
      prompt: questions.prompt,
      order: questions.order,
      status: questions.status,
    })
    .from(questions)
    .where(eq(questions.roomId, roomId))
    .orderBy(questions.order);

  const questionIds = questionRows.map((question) => question.id);
  const optionRows = questionIds.length
    ? await db
        .select({
          id: options.id,
          questionId: options.questionId,
          label: options.label,
          order: options.order,
        })
        .from(options)
        .where(inArray(options.questionId, questionIds))
        .orderBy(options.order)
    : [];

  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const option of optionRows) {
    const existing = optionsByQuestion.get(option.questionId) ?? [];
    existing.push(option);
    optionsByQuestion.set(option.questionId, existing);
  }

  const guestCountRow = await db
    .select({ total: sql<number>`count(*)` })
    .from(participants)
    .where(eq(participants.roomId, roomId))
    .then((rows) => rows[0]);

  const totalGuests = Number(guestCountRow?.total ?? 0);

  return c.json({
    room: {
      id: auth.room.id,
      title: auth.room.title,
      purposeText: auth.room.purposeText,
      status: auth.room.status,
      publishedAt: auth.room.publishedAt ? auth.room.publishedAt.toISOString() : null,
      endedAt: auth.room.endedAt ? auth.room.endedAt.toISOString() : null,
      currentQuestionIndex: auth.room.currentQuestionIndex,
    },
    questions: questionRows.map((question) => ({
      ...question,
      options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
        id: option.id,
        label: option.label,
        order: option.order,
      })),
    })),
    guestCount: {
      active: totalGuests,
      total: totalGuests,
    },
  });
});

app.patch("/api/host/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const auth = await authorizeRoom(c, roomId);
  if (!auth.ok) {
    return auth.response;
  }

  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = updateRoomRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(c, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  }

  const updates: Partial<typeof rooms.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.title !== undefined) {
    updates.title = parsed.data.title ?? null;
  }
  if (parsed.data.purposeText !== undefined) {
    updates.purposeText = parsed.data.purposeText ?? null;
  }

  await db.update(rooms).set(updates).where(eq(rooms.id, roomId));

  await db.insert(auditLogs).values({
    roomId,
    actor: "host",
    action: "update_room",
    meta: { updates: Object.keys(parsed.data) },
  });

  return c.body(null, 204);
});

app.post("/api/host/rooms/:roomId/publish", async (c) => {
  const roomId = c.req.param("roomId");
  const auth = await authorizeRoom(c, roomId);
  if (!auth.ok) {
    return auth.response;
  }

  if (auth.room.status !== "draft") {
    return jsonError(c, 409, "CONFLICT", "Room must be draft to publish");
  }

  await db
    .update(rooms)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, roomId));

  await db.insert(auditLogs).values({
    roomId,
    actor: "host",
    action: "publish",
  });

  return c.json({ roomStatus: "published" });
});

app.post("/api/host/rooms/:roomId/unpublish", async (c) => {
  const roomId = c.req.param("roomId");
  const auth = await authorizeRoom(c, roomId);
  if (!auth.ok) {
    return auth.response;
  }

  if (auth.room.status !== "published") {
    return jsonError(c, 409, "CONFLICT", "Room must be published to unpublish");
  }

  await db
    .update(rooms)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, roomId));

  await db.insert(auditLogs).values({
    roomId,
    actor: "host",
    action: "unpublish",
  });

  return c.json({ roomStatus: "draft" });
});

app.post("/api/host/rooms/:roomId/questions", async (c) => {
  const roomId = c.req.param("roomId");
  const auth = await authorizeRoom(c, roomId);
  if (!auth.ok) {
    return auth.response;
  }

  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = createQuestionRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(c, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  }

  const nextOrderRow = await db
    .select({ maxOrder: sql<number | null>`max(${questions.order})` })
    .from(questions)
    .where(eq(questions.roomId, roomId))
    .then((rows) => rows[0]);

  const nextOrder = (nextOrderRow?.maxOrder ?? -1) + 1;

  const createdQuestion = await db.transaction(async (tx) => {
    const [question] = await tx
      .insert(questions)
      .values({
        roomId,
        order: nextOrder,
        type: parsed.data.type,
        prompt: parsed.data.prompt,
      })
      .returning({
        id: questions.id,
        type: questions.type,
        prompt: questions.prompt,
        order: questions.order,
        status: questions.status,
      });

    if (parsed.data.options && parsed.data.options.length > 0) {
      await tx.insert(options).values(
        parsed.data.options.map((label, index) => ({
          questionId: question.id,
          label,
          order: index,
        }))
      );
    }

    return question;
  });

  await db.insert(auditLogs).values({
    roomId,
    actor: "host",
    action: "create_question",
    meta: { questionId: createdQuestion.id },
  });

  return c.json({ question: createdQuestion }, 201);
});

app.patch("/api/host/questions/:questionId", async (c) => {
  const questionId = c.req.param("questionId");
  const auth = await authorizeQuestion(c, questionId);
  if (!auth.ok) {
    return auth.response;
  }

  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = updateQuestionRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(c, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
  }

  if (parsed.data.options && auth.question.type === "text") {
    return jsonError(c, 400, "VALIDATION_ERROR", "Text questions cannot have options");
  }

  await db.transaction(async (tx) => {
    if (parsed.data.options) {
      await tx.delete(options).where(eq(options.questionId, questionId));
      if (parsed.data.options.length > 0) {
        await tx.insert(options).values(
          parsed.data.options.map((label, index) => ({
            questionId,
            label,
            order: index,
          }))
        );
      }
    }

    if (
      parsed.data.prompt !== undefined ||
      parsed.data.order !== undefined
    ) {
      await tx
        .update(questions)
        .set({
          prompt: parsed.data.prompt ?? auth.question.prompt,
          order: parsed.data.order ?? auth.question.order,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, questionId));
    }
  });

  await db.insert(auditLogs).values({
    roomId: auth.question.roomId,
    actor: "host",
    action: "update_question",
    meta: { questionId },
  });

  return c.body(null, 204);
});

app.delete("/api/host/questions/:questionId", async (c) => {
  const questionId = c.req.param("questionId");
  const auth = await authorizeQuestion(c, questionId);
  if (!auth.ok) {
    return auth.response;
  }

  await db.delete(questions).where(eq(questions.id, questionId));

  await db.insert(auditLogs).values({
    roomId: auth.question.roomId,
    actor: "host",
    action: "delete_question",
    meta: { questionId },
  });

  return c.json({ deleted: true });
});

export default app;
