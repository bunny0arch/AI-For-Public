import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("Vercel packaging", () => {
  it("ships the generated catch-all function while keeping its TypeScript source outside api", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["vercel-build"]).toContain(
      "server/vercelAdapter.ts",
    );
    expect(packageJson.scripts?.["vercel-build"]).toContain(
      "--outfile=api/[...path].js",
    );
    expect(packageJson.scripts?.["vercel-build"]).toContain(
      "--outfile=api/manus-storage/[...path].js",
    );
    expect(
      fs.existsSync(path.join(projectRoot, "server", "vercelAdapter.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectRoot, "api", "[...path].ts")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(projectRoot, "api", "[...path].js")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(projectRoot, "api", "manus-storage", "[...path].js"),
      ),
    ).toBe(true);
  });

  it("routes API and managed media paths through the catch-all adapter", () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8"),
    ) as { rewrites?: Array<{ source: string; destination: string }> };

    expect(vercelConfig.rewrites).toEqual([
      {
        source: "/api/:path*",
        destination: "/api/[...path]",
      },
      {
        source: "/manus-storage/:path*",
        destination: "/api/manus-storage/[...path]",
      },
    ]);
  });
});
