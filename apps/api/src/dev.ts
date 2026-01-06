import app from "./index";
import { serve } from "@hono/node-server";

const port = Number(process.env.PORT ?? 3000);

serve({
  fetch: app.fetch,
  port,
});

console.log(`API listening on http://127.0.0.1:${port}`);
