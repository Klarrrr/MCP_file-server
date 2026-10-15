import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { safePath, display } from "../sandbox.js";
import { defineTool } from "../util.js";

const SKIP = new Set([".git", "node_modules"]);
const MAX_FILE_BYTES = 1_000_000;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.isSymbolicLink()) continue; // never follow symlinks
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

export function registerSearchTools(server: McpServer) {
  defineTool(server, "search_text", {
    description:
      "Case-insensitive text search across files in a folder. Returns 'file:line: text' matches (max 50). Use this to find things instead of reading whole files.",
    inputSchema: {
      query: z.string().min(1).max(200),
      path: z.string().default(".").describe("Folder to search, relative to the workspace"),
    },
  }, async ({ query, path: p }) => {
    const start = await safePath(p);
    const needle = query.toLowerCase();
    const hits: string[] = [];
    outer: for await (const file of walk(start)) {
      const stat = await fs.stat(file);
      if (stat.size > MAX_FILE_BYTES) continue;
      const lines = (await fs.readFile(file, "utf8")).split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          hits.push(`${display(file)}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
          if (hits.length >= 50) break outer;
        }
      }
    }
    return hits.length ? hits.join("\n") : "No matches.";
  });
}
