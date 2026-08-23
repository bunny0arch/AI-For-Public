import { describe, expect, it } from "vitest";

describe("community-chat provider credentials", () => {
  it("accepts the configured Gemini key for a lightweight model-list request", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    expect(response.ok).toBe(true);
  }, 20_000);

  it("accepts the configured OpenRouter key for a lightweight model-list request", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.ok).toBe(true);
  }, 20_000);

  it("accepts the configured ElevenLabs key for a lightweight voice-list request", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey! },
    });
    expect(response.ok).toBe(true);
  }, 20_000);
});
