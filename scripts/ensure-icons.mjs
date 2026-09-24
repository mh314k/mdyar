import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tauriCmd = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri",
);
const svg = join(root, "public", "mdyar.svg");
const out = join(root, "src-tauri", "icons");

if (!existsSync(tauriCmd)) {
  console.error("Tauri CLI not found. Run npm install first.");
  process.exit(1);
}
if (!existsSync(svg)) {
  console.error("Missing public/mdyar.svg");
  process.exit(1);
}

const child = spawn(tauriCmd, ["icon", svg, "-o", out], {
  stdio: "inherit",
  shell: true,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  if (code) process.exit(code);
  for (const extra of ["android", "ios"]) {
    rmSync(join(out, extra), { recursive: true, force: true });
  }
  for (const name of readdirSync(out)) {
    if (name.startsWith("Square") || name === "StoreLogo.png") {
      unlinkSync(join(out, name));
    }
  }
  process.exit(0);
});
