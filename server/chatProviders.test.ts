import { describe, expect, it } from "vitest";
import { applyFarmingSafetyGuard } from "./chatProviders";

describe("scoped chat provider contracts", () => {
  it("has primary and fallback credentials configured", () => {
    expect(process.env.GEMINI_API_KEY).toBeTruthy();
    expect(process.env.OPENROUTER_API_KEY).toBeTruthy();
  });

  it("replaces text-only crop diagnosis speculation with neutral observation guidance", () => {
    const guarded = applyFarmingSafetyGuard(
      "farmers",
      "Brown spots can be a sign of fungal infections like Early Blight.",
      [{ role: "user", content: "My tomato leaves have brown spots after rain." }]
    );

    expect(guarded).toContain("cannot confirm");
    expect(guarded).not.toMatch(/fungal|blight/i);
  });
});
