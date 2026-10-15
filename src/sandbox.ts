import path from "node:path";
import fs from "node:fs/promises";

// Every file the AI touches must live inside ROOT. This is the "sandbox".
export const ROOT = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");

function isInside(root: string, p: string): boolean {
  return p === root || p.startsWith(root + path.sep);
}

/**
 * Turn a user-supplied relative path into a safe absolute path, or throw.
 * Blocks: absolute paths, "..", null bytes, .git access, and symlinks
 * that point outside the workspace.
 */
export async function safePath(userPath: string): Promise<string> {
  if (typeof userPath !== "string" || userPath.length === 0 || userPath.length > 500) {
    throw new Error("Path must be a non-empty string under 500 characters.");
  }
  if (userPath.includes("\0")) throw new Error("Invalid path.");
  if (path.isAbsolute(userPath) || /^[a-zA-Z]:/.test(userPath)) {
    throw new Error("Absolute paths are not allowed. Use a path relative to the workspace.");
  }

  const resolved = path.resolve(ROOT, userPath);
  if (!isInside(ROOT, resolved)) throw new Error("Path escapes workspace root.");

  const rel = path.relative(ROOT, resolved);
  if (rel.split(path.sep).some((seg) => seg.toLowerCase() === ".git")) {
    throw new Error("Access to .git is not allowed. Use the git_* tools instead.");
  }

  // Symlink defence: find the deepest part that exists and check its real location.
  await fs.mkdir(ROOT, { recursive: true });
  const realRoot = await fs.realpath(ROOT);
  let probe = resolved;
  for (;;) {
    try {
      const real = await fs.realpath(probe);
      if (!isInside(realRoot, real)) throw new Error("Symlink escapes workspace root.");
      break;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return resolved;
}

/** Display a path relative to the workspace (never leak the real disk location). */
export function display(abs: string): string {
  return path.relative(ROOT, abs).split(path.sep).join("/") || ".";
}
