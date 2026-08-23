import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { communityPathways } from "../shared/communityPathways";

const publicMediaBase =
  "https://github.com/bunny0arch/AI-For-Public/releases/download/public-media-v1/";

describe("public release media fallback", () => {
  it("uses the approved public release for all rendered pathway images", () => {
    const images = communityPathways.map((pathway) => pathway.image);

    expect(images).toHaveLength(9);
    expect(images.every((image) => image?.startsWith(publicMediaBase))).toBe(true);
  });

  it("uses the public release for the rendered hero, logo, and field-reference image", () => {
    const homeSource = fs.readFileSync(
      path.join(process.cwd(), "client", "src", "pages", "Home.tsx"),
      "utf8",
    );

    expect(homeSource).toContain(publicMediaBase);
    expect(homeSource).toContain("collective-mark.png");
    expect(homeSource).toContain("glass-flower.mp4");
    expect(homeSource).toContain("field-reference.jpg");
  });
});
