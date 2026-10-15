import path from "node:path";
import crypto from "node:crypto";

// Handoff files that may only be added to (never overwritten or deleted).
const APPEND_ONLY = new Set(["plan_log.md", "checkpoints.md", "decisions.md"]);
// Handoff files that can be edited but never deleted.
const NO_DELETE = new Set([...APPEND_ONLY, "project_state.md"]);

const base = (p: string) => path.basename(p).toLowerCase();

export function assertNotAppendOnly(p: string) {
  if (APPEND_ONLY.has(base(p))) {
    throw new Error(`${path.basename(p)} is append-only. Use append_file to add to it.`);
  }
}

export function assertDeletable(p: string) {
  if (NO_DELETE.has(base(p))) {
    throw new Error(`${path.basename(p)} is a handoff file and cannot be deleted.`);
  }
}

export const MAX_WRITE_CHARS = 200_000;

/** Short fingerprint of file content, used for if_version locking. */
export function versionOf(content: string): string {
  return crypto.createHash("sha1").update(content).digest("hex").slice(0, 12);
}
