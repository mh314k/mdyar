import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const cargoHome = process.env.CARGO_HOME || join(homedir(), ".cargo");
const defaultCargoBin = join(cargoHome, "bin");
const cargoName = process.platform === "win32" ? "cargo.exe" : "cargo";
const npmBin = join(root, "node_modules", ".bin");
const tauriCmd = join(
  npmBin,
  process.platform === "win32" ? "tauri.cmd" : "tauri",
);

function findCargoBinDir() {
  const defaultExe = join(defaultCargoBin, cargoName);
  if (existsSync(defaultExe)) return defaultCargoBin;

  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    if (existsSync(join(dir, cargoName))) return dir;
  }
  return null;
}

const cargoBin = findCargoBinDir();
if (!cargoBin) {
  console.error(
    "Rust/Cargo not found. Install from https://rustup.rs/ then reopen the terminal.\n" +
      `Looked for ${cargoName} under CARGO_HOME (${cargoHome}) and PATH.`,
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
