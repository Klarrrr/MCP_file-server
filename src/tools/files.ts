import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { safePath, display, ROOT } from "../sandbox.js";
import { defineTool } from "../util.js";
import { assertNotAppendOnly, assertDeletable, versionOf, MAX_WRITE_CHARS } from "../guards.js";

const HIDDEN = new Set([".git", "node_modules"]);

async function exists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function listDir(dir: string, depth: number, prefix = ""): Promise<string[]> {
  const entries = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((e) => !HIDDEN.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const lines: string[] = [];
  for (const e of entries) {
    lines.push(prefix + e.name + (e.isDirectory() ? "/" : ""));
    if (e.isDirectory() && depth > 1) {
      lines.push(...(await listDir(path.join(dir, e.name), depth - 1, prefix + "  ")));
    }
  }
  return lines;
}

export function registerFileTools(server: McpServer) {
  defineTool(server, "list_files", {
    description:
      "List files and folders inside the workspace. Use this first to explore. depth=1 lists one folder; depth up to 3 shows nested folders. Fails if the path does not exist.",
    inputSchema: {
      path: z.string().default(".").describe("Folder relative to the workspace, e.g. '.' or 'demo'"),
      depth: z.number().int().min(1).max(3).default(1),
    },
  }, async ({ path: p, depth }) => {
    const dir = await safePath(p);
    const lines = await listDir(dir, depth);
    return lines.length ? lines.join("\n") : "(empty folder)";
  });

  defineTool(server, "read_file", {
    description:
      "Read a text file in chunks of lines. Returns a [version] you can pass to write_file/str_replace as if_version to avoid overwriting someone else's edit. For big files, read a chunk at a time with offset/limit, or use search_text first.",
    inputSchema: {
      path: z.string(),
      offset: z.number().int().min(0).default(0).describe("First line to read (0-based)"),
      limit: z.number().int().min(1).max(500).default(200).describe("Max lines to return"),
    },
  }, async ({ path: p, offset, limit }) => {
    const text = await fs.readFile(await safePath(p), "utf8");
    const lines = text.split("\n");
    const end = Math.min(offset + limit, lines.length);
    const more = end < lines.length ? ` (more available: next offset=${end})` : "";
    return `[version: ${versionOf(text)} | lines ${offset}-${end} of ${lines.length}${more}]\n${lines.slice(offset, end).join("\n")}`;
  });

  defineTool(server, "write_file", {
    description:
      "Create a new file or overwrite an existing one with the full content. Parent folders are created. For small edits prefer str_replace. Optional if_version (from read_file) makes the write fail if the file changed since you read it. Cannot be used on append-only handoff files (PLAN_LOG, CHECKPOINTS, DECISIONS).",
    inputSchema: {
      path: z.string(),
      content: z.string().max(MAX_WRITE_CHARS),
      if_version: z.string().optional().describe("Version from read_file; write fails if the file changed"),
    },
  }, async ({ path: p, content, if_version }) => {
    assertNotAppendOnly(p);
    const full = await safePath(p);
    if (if_version && (await exists(full))) {
      const current = versionOf(await fs.readFile(full, "utf8"));
      if (current !== if_version) {
        throw new Error(`Version conflict: file is now version ${current}, you had ${if_version}. Re-read it and merge.`);
      }
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
    return `Wrote ${content.length} chars to ${display(full)} (version ${versionOf(content)})`;
  });

  defineTool(server, "append_file", {
    description:
      "Add text to the END of a file without reading it first (creates it if missing). The correct tool for PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md. A newline is added before your text.",
    inputSchema: { path: z.string(), content: z.string().min(1).max(20_000) },
  }, async ({ path: p, content }) => {
    const full = await safePath(p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.appendFile(full, "\n" + content, "utf8");
    return `Appended ${content.length} chars to ${display(full)}`;
  });

  defineTool(server, "str_replace", {
    description:
      "Replace ONE exact occurrence of old_str with new_str in a file. old_str must appear exactly once or the call fails, so include surrounding text to make it unique. Read the file first. Optional if_version guards against concurrent edits.",
    inputSchema: {
      path: z.string(),
      old_str: z.string().min(1),
      new_str: z.string().max(MAX_WRITE_CHARS),
      if_version: z.string().optional(),
    },
  }, async ({ path: p, old_str, new_str, if_version }) => {
    assertNotAppendOnly(p);
    const full = await safePath(p);
    const text = await fs.readFile(full, "utf8");
    if (if_version && versionOf(text) !== if_version) {
      throw new Error(`Version conflict: file is now version ${versionOf(text)}, you had ${if_version}. Re-read it.`);
    }
    const count = text.split(old_str).length - 1;
    if (count === 0) throw new Error("old_str was not found. Re-read the file and copy the text exactly.");
    if (count > 1) throw new Error(`old_str matched ${count} times; it must match exactly once. Add more surrounding text.`);
    const updated = text.replace(old_str, () => new_str); // function form: no special $ patterns
    await fs.writeFile(full, updated, "utf8");
    return `Replaced 1 occurrence in ${display(full)} (new version ${versionOf(updated)})`;
  });

  defineTool(server, "delete_file", {
    description:
      "Permanently delete ONE file (not folders). Destructive: requires confirm=true and is always logged. Handoff files (PROJECT_STATE, PLAN_LOG, CHECKPOINTS, DECISIONS) cannot be deleted. Prefer git_commit before deleting so it can be recovered.",
    inputSchema: { path: z.string(), confirm: z.literal(true).describe("Must be true") },
  }, async ({ path: p }) => {
    assertDeletable(p);
    const full = await safePath(p);
    if ((await fs.stat(full)).isDirectory()) throw new Error("delete_file only deletes files, not folders.");
    await fs.unlink(full);
    return `Deleted ${display(full)}`;
  });
}

export { ROOT };
