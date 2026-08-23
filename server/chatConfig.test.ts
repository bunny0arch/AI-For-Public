import { describe, expect, it } from "vitest";
import { communityPathways } from "../shared/communityPathways";
import { buildChatSystemPrompt, buildRouterSystemPrompt, CHAT_MODEL, detectDomainRoute, extractAssistantText, PATHWAY_IDS, ROUTING_MODEL } from "./chatConfig";

describe("community chat configuration", () => {
  it("defines nine uniquely addressable community pathways", () => {
    expect(communityPathways).toHaveLength(9);
    expect(new Set(communityPathways.map((pathway) => pathway.id)).size).toBe(9);
  });

  it("builds a safety-aware prompt for each pathway", () => {
    const prompt = buildChatSystemPrompt("farmers");

    expect(CHAT_MODEL).toBe("claude-haiku-4-5");
    expect(ROUTING_MODEL).toBe("gpt-5-nano");
    expect(prompt).toContain("AI for Farmers");
    expect(prompt).toContain("You are Asha");
    expect(prompt).toContain("never imply that you are a real person");
    expect(prompt).toContain("must not invent real-time weather");
    expect(prompt).toContain("NEVER name a disease");
  });

  it("gives every pathway a named AI guide introduction and disclosed guide voice", () => {
    for (const pathway of communityPathways) {
      const prompt = buildChatSystemPrompt(pathway.id);
      expect(pathway.greeting).toContain(`I’m ${pathway.guide.name}`);
      expect(prompt).toContain(`You are ${pathway.guide.name}`);
      expect(prompt).toContain("never imply that you are a real person");
    }
  });

  it("rejects an unknown pathway", () => {
    expect(() => buildChatSystemPrompt("unknown")).toThrow("Unknown community pathway");
  });

  it("gives the routing layer every pathway and an open-field fallback", () => {
    const routerPrompt = buildRouterSystemPrompt("farmers");

    expect(PATHWAY_IDS).toContain("open-field");
    expect(routerPrompt).toContain("open-field");
    expect(routerPrompt).toContain("AI for Fishermen");
  });

  it("deterministically protects obvious in-scope and cross-scope questions", () => {
    expect(detectDomainRoute("My tomato leaves have brown spots after rain")).toBe("farmers");
    expect(detectDomainRoute("What safety checks does my fishing boat need?")).toBe("fishermen");
    expect(detectDomainRoute("How can our neighborhood organise a safe shared space for children after school?")).toBe("open-field");
    expect(detectDomainRoute("Can you write a poem about the moon?")).toBeNull();
  });

  it("normalizes string and text-part model responses", () => {
    expect(extractAssistantText("A concise answer")).toBe("A concise answer");
    expect(extractAssistantText([{ type: "text", text: "First" }, { type: "text", text: "Second" }])).toBe("First\nSecond");
    expect(extractAssistantText([{ type: "image_url", image_url: { url: "https://example.com" } }])).toBe("");
  });
});
