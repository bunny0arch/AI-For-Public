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
    expect(homeSource).toContain("Switching to");
    expect(homeSource).toContain("carriedQuestion");
    expect(homeSource).toContain("role: \"user\" as const, content: nextCarriedQuestion");
    expect(homeSource).toContain("triggerHandoffHaptic");
    expect(homeSource).toContain("navigator as Navigator");
    expect(homeSource).toContain("returnToPreviousGuide");
    expect(homeSource).toContain("Pinned original question");
    expect(homeSource).toContain("const REDIRECT_STATUS_SETTLE_MS = 180");
    expect(homeSource).toContain("setHandoffStage(\"opening\")");
    expect(homeSource).toContain("const shouldRenderConversationLayer = Boolean(selectedPathway || (isGuideRedirecting && redirectDestination));");
    expect(homeSource).toContain("aria-label=\"Guide handoff progress\"");
    expect(homeSource).toContain("Step 2 of 2");
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
    expect(styleSource).toContain("dock-guide-handoff-out-mobile");
    expect(styleSource).toContain(".redirect-status");
    expect(styleSource).toContain(".redirect-progress");
    expect(styleSource).toContain("redirect-progress-sheen");
    expect(styleSource).toContain(".dock-return");
    expect(styleSource).toContain(".carried-question");
  });
});
