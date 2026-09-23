import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const cargoBin = join(homedir(), ".cargo", "bin");
const cargoExe = join(cargoBin, process.platform === "win32" ? "cargo.exe" : "cargo");
const npmBin = join(root, "node_modules", ".bin");
const tauriCmd = join(
  npmBin,
  process.platform === "win32" ? "tauri.cmd" : "tauri",
);

if (!existsSync(cargoExe)) {
  console.error(
    "Rust/Cargo not found. Install from https://rustup.rs/ then reopen the terminal.\n" +
      `Expected: ${cargoExe}`,
  );
  process.exit(1);
}

if (!existsSync(tauriCmd)) {
  console.error(
    "Tauri CLI not found. Run npm install first.\n" + `Expected: ${tauriCmd}`,
  );
  process.exit(1);
}

const pathParts = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
const prepend = [cargoBin, npmBin].filter((p) => !pathParts.includes(p));
if (prepend.length) {
  process.env.PATH = `${prepend.join(delimiter)}${delimiter}${process.env.PATH ?? ""}`;
}

const args = process.argv.slice(2);
const child = spawn(tauriCmd, args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
