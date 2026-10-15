import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ROOT } from "./sandbox.js";
import { log } from "./logger.js";

export const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
export const fail = (message: string) => ({
  isError: true as const,
  content: [{ type: "text" as const, text: message }],
});

function summarize(args: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args ?? {})) {
    out[k] = typeof v === "string" && v.length > 80 ? v.slice(0, 80) + `...(${v.length} chars)` : v;
  }
  return out;
}

/**
 * Register a tool with built-in logging and safe error handling.
 * The handler returns a string; thrown errors become isError results
 * (no stack traces, no real disk paths).
 */
export function defineTool(
  server: McpServer,
  name: string,
  config: { description: string; inputSchema: any },
  handler: (args: any) => Promise<string>
) {
  server.registerTool(name, config as any, (async (args: any) => {
    const started = Date.now();
    try {
      const text = await handler(args);
      log({ tool: name, args: summarize(args), ok: true, ms: Date.now() - started });
      return ok(text);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw.split(ROOT).join("<workspace>");
      log({ tool: name, args: summarize(args), ok: false, error: msg, ms: Date.now() - started });
      return fail(msg);
    }
  }) as any);
}
