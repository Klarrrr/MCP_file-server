// Creates workspace/ and copies the handoff templates in (never overwrites).
import fs from "node:fs";
import path from "node:path";
const src = "workspace-template";
const dst = process.env.WORKSPACE_ROOT ?? "workspace";
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) {
  const target = path.join(dst, f);
  if (!fs.existsSync(target)) {
    fs.copyFileSync(path.join(src, f), target);
    console.log("created", target);
  } else {
    console.log("kept existing", target);
  }
}
