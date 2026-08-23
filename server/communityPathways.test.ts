import { describe, expect, it } from "vitest";
import { communityPathways } from "../shared/communityPathways";

describe("community pathway guide portraits", () => {
  it("uses the nine supplied illustrations in the pathway order and excludes failed generated portraits", () => {
    const portraits = communityPathways.map((pathway) => pathway.guide.portrait);

    expect(portraits).toHaveLength(9);
    expect(new Set(portraits).size).toBe(9);
    expect(portraits.every((portrait) => portrait.startsWith("/manus-storage/"))).toBe(true);
    expect(portraits).not.toContain("/manus-storage/guide-leela-climate_c2190c92.png");
    expect(portraits).not.toContain("/manus-storage/guide-saira-community_f8a3d13f.png");
    expect(portraits).toEqual([
      "/manus-storage/guide-farmer-supplied_cc1420fa.png",
      "/manus-storage/guide-fisherman-supplied_1c077d7c.png",
      "/manus-storage/guide-artisan-supplied_25818d08.png",
      "/manus-storage/guide-vendor-supplied_c0fe4b4f.png",
      "/manus-storage/guide-service-supplied_6dc22742.png",
      "/manus-storage/guide-access-supplied_31f6f670.png",
      "/manus-storage/guide-learning-supplied_468065a8.png",
      "/manus-storage/guide-resilience-supplied_7de0b106.png",
      "/manus-storage/guide-community-supplied_b7f28e9d.png",
    ]);
  });
});
