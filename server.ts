import express from "express";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./server/_core/oauth";
import { registerStorageProxy } from "./server/_core/storageProxy";
import { createContext } from "./server/_core/context";
import { appRouter } from "./server/routers";

// Vercel discovers this root-level default Express export automatically. It
// intentionally mirrors the production route wiring in server/_core/index.ts
// without creating a listener; Vercel owns the serverless lifecycle.
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Vercel serves public/** from its CDN before this function. The fallback keeps
// the existing single-page client routing behavior for non-API routes.
const clientIndex = path.resolve(process.cwd(), "public", "index.html");
app.get("*", (_req, res) => {
  res.sendFile(clientIndex);
});

export default app;
