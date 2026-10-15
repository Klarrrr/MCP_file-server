import { describe, it, expect } from "vitest";
import { assertDeletable, assertNotAppendOnly, versionOf } from "./guards.js";

describe("guards", () => {
  it("blocks overwriting append-only files", () => {
    expect(() => assertNotAppendOnly("PLAN_LOG.md")).toThrow(/append-only/);
    expect(() => assertNotAppendOnly("demo/checkpoints.md")).toThrow(/append-only/);
    expect(() => assertNotAppendOnly("notes.md")).not.toThrow();
  });
  it("blocks deleting handoff files", () => {
    for (const f of ["PROJECT_STATE.md", "PLAN_LOG.md", "CHECKPOINTS.md", "DECISIONS.md"]) {
      expect(() => assertDeletable(f)).toThrow(/cannot be deleted/);
    }
    expect(() => assertDeletable("scratch.txt")).not.toThrow();
  });
  it("version changes when content changes", () => {
    expect(versionOf("a")).toBe(versionOf("a"));
    expect(versionOf("a")).not.toBe(versionOf("b"));
  });
});
