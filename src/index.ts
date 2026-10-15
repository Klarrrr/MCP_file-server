import "dotenv/config";
import crypto from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ROOT } from "./sandbox.js";
import { registerFileTools } from "./tools/files.js";
import { registerSearchTools } from "./tools/search.js";
import { registerGitTools } from "./tools/git.js";

const TOKEN = process.env.AUTH_TOKEN ?? "";
const PORT = Number(process.env.PORT ?? 3000);

// Refuse to start with a missing or weak secret: an open public endpoint is the worst failure.
if (TOKEN.length < 16 || TOKEN.startsWith("replace-with")) {
  console.error("AUTH_TOKEN is missing or too short. Set a long random value in .env (see .env.example).");
  process.exit(1);
}

function buildServer() {
  const server = new McpServer({ name: "mcp-files", version: "1.0.0" });
  registerFileTools(server);   // list_files, read_file, write_file, append_file, str_replace, delete_file
  registerSearchTools(server); // search_text
  registerGitTools(server);    // git_status, git_diff, git_commit, git_log
  return server;
}

// Constant-time comparison so response timing cannot leak the token.
function sameSecret(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Accept the token EITHER as "Authorization: Bearer <token>" OR as a secret URL path /mcp/<token>.
// (Some clients cannot send custom headers, so the secret path is the fallback.)
function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const pathToken = typeof req.params.token === "string" ? req.params.token : "";
  if ((bearer && sameSecret(bearer, TOKEN)) || (pathToken && sameSecret(pathToken, TOKEN))) return next();
  res.status(401).json({ error: "unauthorized" });
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" })); // no secrets, safe to expose

app.post(["/mcp", "/mcp/:token"], auth, async (req, res) => {
  // Stateless mode: a fresh server + transport per request. Simple and restart-safe.
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error("MCP request failed:", e instanceof Error ? e.message : e);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

// Stateless servers do not support GET (SSE stream) or DELETE (session end).
app.all(["/mcp", "/mcp/:token"], (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
});

app.listen(PORT, () => {
  console.log(`MCP file server listening on port ${PORT}`);
  console.log(`Workspace root: ${ROOT}`);
});
