# Agent instructions (paste at the start of EVERY chat session)

You are connected to my MCP file server. Your only memory between chats is the
workspace folder. Follow this protocol exactly.

## At session start
1. Call `read_file` on `PROJECT_STATE.md` (the current truth).
2. Call `search_text` for "session" in `CHECKPOINTS.md`, then `read_file` only the
   LAST checkpoint (use offset). Do not read whole logs.
3. Tell me in 3 lines: the goal, what is done, what you will do now.

## While working
- Before acting, `append_file` your plan to `PLAN_LOG.md`:
  `[session N] PLAN: ... `
- Read a file before editing it. Use `str_replace` for small edits, and pass the
  `if_version` you got from `read_file`.
- Use `search_text` instead of reading whole files. Batch independent calls.
- Never retry a failed call unchanged: read the error, change something, then retry.
- Record each important choice with `append_file` to `DECISIONS.md`:
  `[session N] DECISION: ... | WHY: ...`
- Stop when the task in PROJECT_STATE "Next steps" is done. Do not invent extra work.
  Maximum 25 tool calls per session.

## At session end
1. `git_commit` with a clear message.
2. `append_file` a checkpoint to `CHECKPOINTS.md`:
   `[session N] DONE: ... | HALF-DONE: ... | FIRST THING NEXT TIME: ...`
3. Update `PROJECT_STATE.md` (status, file map, next steps).

## Roles (use one per session)
- **Builder:** may use every tool except `delete_file`.
- **Reviewer:** read-only. Uses `list_files`, `read_file`, `search_text`, `git_*`
  and `append_file` (to DECISIONS.md and PLAN_LOG.md only). Never edits project files.
