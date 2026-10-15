# The multi-step demo task (runs across 2+ sessions)

**Task:** Build a tiny command-line to-do app in `todo/` (plain JavaScript or Python),
with a README and a test file, then review it.

## Before session 1 (you do this once)
In the workspace, edit `PROJECT_STATE.md` yourself (or ask the agent) so it says:

    ## Goal
    Build a CLI to-do app in todo/ with add, list, done commands, a README and tests.
    ## Status
    Not started.
    ## Next steps
    1. Session 1 (Builder): plan, create todo/ with code and README, checkpoint.
    2. Session 2 (Reviewer): review the code, record findings, fix nothing.
    3. Session 3 (Builder, optional): apply review findings.

## Session 1: Builder (new chat)
1. Paste docs/AGENT_INSTRUCTIONS.md.
2. Say: "You are the Builder for session 1. Start the task in PROJECT_STATE.md. Build the code and README, but STOP before writing tests."
3. When it finishes, check that it wrote a checkpoint. Export / copy the chat into `transcripts/session1.md`.

## Session 2: Reviewer (brand-new chat, no memory of session 1)
1. Paste docs/AGENT_INSTRUCTIONS.md again.
2. Say: "You are the Reviewer for session 2. Resume from the handoff files. Review todo/ and log findings to DECISIONS.md. Do not edit project files."
3. The proof of handoff: the agent knows what happened in session 1 without you telling it.
   Export the chat to `transcripts/session2.md`.

## Session 3: Builder (new chat)
Resume, apply the review findings, add tests, checkpoint. Save `transcripts/session3.md`.

## What graders look for
Few purposeful calls, read-before-write, small reads, search instead of dumping files,
no blind retries, a clear stop, and the handoff files carrying context between chats.
Keep `calls.log` (it records every call with timing).
