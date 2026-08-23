import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("cursor sphere substitution", () => {
  it("hides the native cursor only for fine-pointer, normal-motion browsing", () => {
    const styleSource = fs.readFileSync(
      path.join(projectRoot, "client", "src", "index.css"),
      "utf8",
    );

    expect(styleSource).toContain("@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    expect(styleSource).toContain(".site-shell, .site-shell button:not(:disabled), .site-shell a[href] { cursor: none; }");
    expect(styleSource).toContain(".site-shell .conversation-dock button:not(:disabled)");
    expect(styleSource).toContain(".cursor-sphere");
    expect(styleSource).toContain("background: #d2ad5e");
    expect(styleSource).toContain("rgba(210, 173, 94, 0.64)");
  });
});
