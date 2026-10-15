# Midterms Pt 1 Report: MCP File-Server Connector
Name: ____  Section: ____  Date: ____

## 1. Stack and why (rubric D)
| Layer | Choice | Why this over the alternative |
|---|---|---|
| Runtime / SDK | Node.js + official TypeScript MCP SDK | Reference SDK, strongest docs/examples; ______ |
| Transport | Streamable HTTP | stdio only works for a local subprocess; I need remote access from a cloud client |
| Validation | zod | Schemas double as the JSON Schema the model reads; rejects bad input before it reaches the filesystem |
| Exposure | ngrok static domain | Stable HTTPS URL with no server to rent; limits: ______ |
| Process manager | pm2 | Auto-restart on crash; survives terminal close; limits: ______ |
| Version control | git (in code repo + inside workspace) | Meaningful history for me; checkpoint/recovery for agents |

Restart test result: ______ (what I did, what happened)

## 2. Tool design choices (rubric C)
- 11 single-purpose tools; each description says what it does, when to use it, and how it fails.
- `read_file` is chunked (offset/limit) and returns a version -> keeps outputs small, enables locking.
- `append_file` exists so logs never need read-modify-write -> fewer calls, no lost updates.
- `str_replace` requires exactly one match -> prevents silent wrong edits.
- Errors use `isError` with actionable text (e.g., "matched 3 times, add context") so the agent can recover.
- What I would change: ______

## 3. Security tradeoffs (rubric E)
| Threat | Mitigation | Tested how |
|---|---|---|
| Path traversal (`../`, absolute, drive letter) | resolve + inside-root check | sandbox.test.ts |
| Symlink escape | realpath of deepest existing parent | sandbox.test.ts |
| Tampering with git internals | `.git` blocked in file tools | sandbox.test.ts |
| Anyone on the internet calling the tunnel | AUTH_TOKEN (Bearer or secret path), constant-time compare | curl without token -> 401 |
| Command injection via git tools | execFile argument arrays, no shell | code review |
| Agent deletes its own memory | delete needs confirm; handoff files protected; logs append-only | guards.test.ts |
| Lost updates from concurrent agents | if_version locking | manual test: ______ |

Not covered / known risks: one shared token gives full access to all tools; no rate limiting;
token in URL path can appear in logs of intermediaries; tunnel provider sees traffic;
no per-agent permissions (roles are by instruction, not enforced). Next step: per-agent tokens with tool allowlists.

## 4. Evidence of the multi-session task (rubric A, B)
- Task: CLI to-do app, 3 sessions (Builder -> Reviewer -> Builder)
- Total tool calls per session: S1 __, S2 __, S3 __ (from calls.log)
- Failed/retried calls and what I learned: ______
- How the handoff files carried context (quote one line from CHECKPOINTS.md that session 2 used): ______

## 5. Lessons learned
______
