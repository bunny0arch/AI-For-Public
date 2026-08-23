import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("guide redirect handoff", () => {
  it("unmounts the current dock before mounting the destination dock", () => {
    const homeSource = fs.readFileSync(
      path.join(projectRoot, "client", "src", "pages", "Home.tsx"),
      "utf8",
    );

    const unmountIndex = homeSource.indexOf("setSelectedPathway(null);");
    const destinationIndex = homeSource.indexOf("setSelectedPathway(destination);");

    expect(homeSource).toContain("const REDIRECT_HANDOFF_MS = 250");
    expect(homeSource).toContain("setIsGuideRedirecting(true)");
    expect(unmountIndex).toBeGreaterThan(-1);
    expect(destinationIndex).toBeGreaterThan(unmountIndex);
    expect(homeSource).toContain("window.requestAnimationFrame(() => {");
  });

  it("uses a dedicated fade-and-pull source-dock exit animation", () => {
    const styleSource = fs.readFileSync(
      path.join(projectRoot, "client", "src", "index.css"),
      "utf8",
    );

    expect(styleSource).toContain(".conversation-layer.is-redirecting .conversation-dock");
    expect(styleSource).toContain("dock-guide-handoff-out");
  });
});
