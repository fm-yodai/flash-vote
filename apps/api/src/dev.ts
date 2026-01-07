import { serve } from "@hono/node-server";
import { config as loadEnv } from "dotenv";
import path from "node:path";

const rootEnvPath = path.resolve(process.cwd(), "..", "..", ".env");
loadEnv({ path: rootEnvPath });

const port = Number(process.env.PORT ?? 3000);

import("./index")
  .then(({ default: app }) => {
    serve({
      fetch: app.fetch,
      port,
    });

    console.log(`API listening on http://127.0.0.1:${port}`);
  })
  .catch((err) => {
    console.error("Failed to start API server", err);
    process.exit(1);
  });
