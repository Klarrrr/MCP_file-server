# mcp-files: an MCP file-server connector for AI agents

A small server that gives an AI agent a **sandboxed folder** (the workspace) plus 11 tools
to work in it, so separate chat sessions can pass context to each other through files.

```
AI client (e.g. Claude)  --HTTPS-->  ngrok tunnel  -->  this server (Node.js, port 3000)  -->  workspace/
```

# fake workspace folder

README.txt contents:
    This is not the real workspace, this is only what the content in workspace. I have to create this folder due to workspace cannot be push in the repository for best practice because it contains its own .git folder, which the outer repository can’t track properly anyway, so ignoring it avoids confusing “embedded repository” warnings.
    The content in this folder is the real content in workspace but only in a form of text
    
## Tools (11)

| Tool          | What it does                                                        |
| ------------- | ------------------------------------------------------------------- |
| `list_files`  | List a folder (depth 1-3)                                           |
| `read_file`   | Read a file in line chunks; returns a `version` for locking         |
| `write_file`  | Create/overwrite a file (optional `if_version` lock)                |
| `append_file` | Add to the end of a file (for the append-only logs)                 |
| `str_replace` | Replace one exact, unique occurrence of text                        |
| `delete_file` | Delete one file; needs `confirm: true`; handoff files are protected |
| `search_text` | Case-insensitive search across files (max 50 hits)                  |
| `git_status`  | Show changed files                                                  |
| `git_diff`    | Show uncommitted changes                                            |
| `git_commit`  | Stage everything and commit                                         |
| `git_log`     | Show recent commits                                                 |

## Prerequisites

- Node.js 20+ LTS (`node --version`)
- Git (`git --version`)
- A free ngrok account (only for the public tunnel step)

## Setup

```bash
# 1. install libraries
npm install @modelcontextprotocol/sdk zod express dotenv
npm install -D typescript tsx vitest @types/node @types/express

# 2. create the workspace and handoff files
npm run init

# 3. configure secrets
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# Generate a token and paste it as AUTH_TOKEN in .env:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Run locally

```bash
npm run dev
```

You should see `MCP file server listening on port 3000`.

## Test

```bash
npm test
```

Runs the path-traversal and guard tests.

### Test with MCP Inspector

In a second terminal: `npx @modelcontextprotocol/inspector`. Add a Streamable HTTP server with URL
`http://localhost:3000/mcp/<YOUR_AUTH_TOKEN>` (or send the header `Authorization: Bearer <token>`),
connect, then List Tools and run each one.

## Deploy

```bash
npm run build
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Surviving a reboot:

- **Mac/Linux:** `pm2 startup` and run the command it prints.
- **Windows:** `pm2 startup` is not supported. Use `npm i -g pm2-windows-startup` then `pm2-startup install`, or a Task Scheduler task that runs `pm2 resurrect` at login.

Expose it over HTTPS (separate terminal):

```bash
ngrok config add-authtoken <your ngrok token>
ngrok http --domain=amenity-punctual-punctuate.ngrok-free.dev 3000
```

Your connector URL is `https://amenity-punctual-punctuate.ngrok-free.dev/mcp/<your AUTH_TOKEN>`
(secret-path style, works with clients that cannot send headers), or `.../mcp` with a Bearer header.

Quick checks:

```bash
curl https://<domain>/health                      # {"status":"ok"}
curl -X POST https://<domain>/mcp                 # 401 unauthorized
```

## Connect a real client (Claude)

Settings > Connectors > Add custom connector > paste the connector URL. Then ask:
"List the files in my workspace."

## Handoff protocol

Four files in `workspace/` carry context between sessions:

| File               | Rule                                              |
| ------------------ | ------------------------------------------------- |
| `PROJECT_STATE.md` | Editable. Current truth. Read first, update last. |
| `PLAN_LOG.md`      | Append-only. Plans and progress.                  |
| `CHECKPOINTS.md`   | Append-only. End-of-session summaries.            |
| `DECISIONS.md`     | Append-only. Choices and reasons.                 |

Paste `docs/AGENT_INSTRUCTIONS.md` at the start of every chat. The demo task is in `docs/DEMO_TASK.md`.

## Security design

- All paths resolve against `WORKSPACE_ROOT`; `..`, absolute paths, drive letters, null bytes, `.git` and symlink escapes are rejected (`src/sandbox.ts`, tested).
- Public endpoint requires `AUTH_TOKEN` (compared in constant time); server refuses to start without a strong one.
- Secrets live in `.env`, which is git-ignored.
- Git runs through `execFile` with argument arrays (no shell, no command injection).
- Destructive actions: `delete_file` needs `confirm: true`, is logged, and cannot touch handoff files.
- Every tool call is logged to `calls.log`. Errors are returned via `isError` with real disk paths removed.

## Project layout

```
src/index.ts        HTTP server, auth, MCP wiring
src/sandbox.ts      path safety
src/guards.ts       handoff-file rules, version hashing
src/util.ts         defineTool: logging + safe errors
src/logger.ts       calls.log writer
src/tools/          files.ts, search.ts, git.ts
src/*.test.ts       sandbox and guard tests
workspace-template/ handoff file templates
docs/               agent instructions, demo task/script, report template
transcripts/        save your session transcripts here
```

## Troubleshooting

- `AUTH_TOKEN is missing or too short`: set it in `.env`.
- Inspector cannot connect: server must be running; URL must include `/mcp`.
- Port in use: stop the other copy (Ctrl+C) or change `PORT`.

## 2 CHAT SESSION HISTORY

- is in the docs/chat1_history.txt and docs/chat2_history.txt
