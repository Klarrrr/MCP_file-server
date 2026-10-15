import fs from "node:fs";

// One JSON line per tool call. This file is your evidence for the efficiency rubric.
export function log(entry: Record<string, unknown>) {
  try {
    fs.appendFileSync("calls.log", JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    /* logging must never crash the server */
  }
}
