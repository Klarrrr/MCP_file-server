import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let tmp: string;
let outside: string;
let safePath: (p: string) => Promise<string>;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-ws-"));
  outside = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-outside-"));
  process.env.WORKSPACE_ROOT = tmp; // must be set BEFORE importing the sandbox
  ({ safePath } = await import("./sandbox.js"));
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.rm(outside, { recursive: true, force: true });
});

describe("sandbox: allowed paths", () => {
  for (const good of [".", "a.md", "demo/PROJECT_STATE.md", "a/b/../c.txt", "new/folder/file.txt"]) {
    it(`allows ${JSON.stringify(good)}`, async () => {
      const abs = await safePath(good);
      expect(abs.startsWith(await fs.realpath(tmp)) || abs.startsWith(tmp)).toBe(true);
    });
  }
});

describe("sandbox: path traversal is rejected", () => {
  const bad = [
    "..",
    "../x",
    "../../etc/passwd",
    "a/../../x",
    "a/../../../x",
    "/etc/passwd",
    "C:\\Windows\\system32",
    "a\0b",
    "",
    ".git/config",
    "sub/.git/hooks/pre-commit",
    ".GIT/config",
  ];
  for (const b of bad) {
    it(`rejects ${JSON.stringify(b)}`, async () => {
      await expect(safePath(b)).rejects.toThrow();
    });
  }
});

describe("sandbox: symlinks", () => {
  it("rejects a symlink that points outside the workspace", async () => {
    try {
      await fs.symlink(outside, path.join(tmp, "escape"), "dir");
    } catch {
      return; // creating symlinks may need admin rights on Windows; skip there
    }
    await expect(safePath("escape/secret.txt")).rejects.toThrow(/symlink/i);
  });
});
