import type { Request, Response } from "express";
import app from "../server.js";

// Vercel routes its catch-all serverless function under /api. The application
// itself already owns /api/trpc, while managed media arrives here through the
// /manus-storage rewrite below and needs its original route restored.
export default function vercelHandler(req: Request, res: Response) {
  if (req.url?.startsWith("/api/manus-storage/")) {
    req.url = req.url.replace(/^\/api/, "");
  }
  return app(req, res);
}
