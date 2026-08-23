import { describe, expect, it } from "vitest";
import { communityPathways } from "../shared/communityPathways";

describe("community pathway guide portraits", () => {
  it("uses nine distinct managed assets and excludes the failed generated portraits", () => {
    const portraits = communityPathways.map((pathway) => pathway.guide.portrait);

    expect(portraits).toHaveLength(9);
    expect(new Set(portraits).size).toBe(9);
    expect(portraits.every((portrait) => portrait.startsWith("/manus-storage/"))).toBe(true);
    expect(portraits).not.toContain("/manus-storage/guide-leela-climate_c2190c92.png");
    expect(portraits).not.toContain("/manus-storage/guide-saira-community_f8a3d13f.png");
  });
});
