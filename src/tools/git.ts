import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ROOT, safePath } from "../sandbox.js";
import { defineTool } from "../util.js";

const run = promisify(execFile);

// execFile with an argument ARRAY: user text is never parsed by a shell,
// so it cannot inject extra commands.
async function git(args: string[]): Promise<string> {
  await fs.mkdir(ROOT, { recursive: true });
  try {
    await fs.access(path.join(ROOT, ".git"));
  } catch {
    await run("git", ["init"], { cwd: ROOT, timeout: 10_000 });
  }
  try {
    const { stdout } = await run("git", args, { cwd: ROOT, timeout: 10_000, maxBuffer: 1_000_000 });
    return stdout.trim();
  } catch (e: any) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    if (/nothing to commit/i.test(out)) return "Nothing to commit (working tree clean).";
    throw new Error(out || "git command failed");
  }
}

export function registerGitTools(server: McpServer) {
  defineTool(server, "git_status", {
    description: "Show changed, new and deleted files in the workspace (short format). Empty means clean.",
    inputSchema: {},
  }, async () => (await git(["status", "--short"])) || "Clean: no changes.");

  defineTool(server, "git_diff", {
    description: "Show uncommitted changes, optionally for one file. Output is capped at 8000 characters.",
    inputSchema: { path: z.string().optional() },
  }, async ({ path: p }) => {
    const args = ["diff", "--no-color"];
    if (p) {
      await safePath(p);
      args.push("--", p);
    }
    const out = await git(args);
    if (!out) return "No unstaged changes.";
    return out.length > 8000 ? out.slice(0, 8000) + "\n...(truncated)" : out;
  });

  defineTool(server, "git_commit", {
    description:
      "Stage ALL changes and commit them with a message. Use as a checkpoint before risky edits and at the end of a session.",
    inputSchema: { message: z.string().min(3).max(200) },
  }, async ({ message }) => {
    await git(["add", "-A"]);
    return await git(["-c", "user.name=mcp-agent", "-c", "user.email=agent@mcp.local", "commit", "-m", message]);
  });

  defineTool(server, "git_log", {
    description: "Show recent commits, one line each (newest first).",
    inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
  }, async ({ limit }) => {
    try {
      return (await git(["log", "--oneline", "-n", String(limit)])) || "No commits yet.";
    } catch (e: any) {
      if (/does not have any commits/i.test(String(e.message))) return "No commits yet.";
      throw e;
    }
  });
}
