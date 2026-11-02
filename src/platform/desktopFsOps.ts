/** Desktop-only create / delete / copy / move for the folder explorer. */

import { isTauriShell } from "./fs";

export type PathKind = "file" | "dir";

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function parentDir(path: string): string {
  const normalized = path.replace(/[/\\]+$/, "");
  const parts = normalized.split(/[/\\]/);
  if (parts.length <= 1) return normalized;
  parts.pop();
  return parts.join(path.includes("\\") ? "\\" : "/") || normalized;
}

function splitName(name: string): { stem: string; ext: string } {
  const i = name.lastIndexOf(".");
  if (i <= 0) return { stem: name, ext: "" };
  return { stem: name.slice(0, i), ext: name.slice(i) };
}

export async function pathKind(path: string): Promise<PathKind | null> {
  if (!isTauriShell()) return null;
  const { exists, stat } = await import("@tauri-apps/plugin-fs");
  if (!(await exists(path))) return null;
  const info = await stat(path);
  if (info.isDirectory) return "dir";
  if (info.isFile) return "file";
  return null;
}

export async function uniqueSiblingPath(desiredPath: string): Promise<string> {
  const { exists } = await import("@tauri-apps/plugin-fs");
  if (!(await exists(desiredPath))) return desiredPath;

  const dir = parentDir(desiredPath);
  const { join } = await import("@tauri-apps/api/path");
  const { stem, ext } = splitName(basename(desiredPath));

  let n = 1;
  while (true) {
    const candidate = await join(dir, `${stem} copy${n > 1 ? ` ${n}` : ""}${ext}`);
    if (!(await exists(candidate))) return candidate;
    n += 1;
  }
}

export async function createTextFile(dir: string, name: string, content = ""): Promise<string> {
  if (!isTauriShell()) throw new Error("desktop-only");
  const { join } = await import("@tauri-apps/api/path");
  const { writeTextFile, exists } = await import("@tauri-apps/plugin-fs");
  const safe = name.trim() || "untitled.md";
  const target = await uniqueSiblingPath(await join(dir, safe));
  if (await exists(target)) throw new Error("exists");
  await writeTextFile(target, content);
  return target;
}

export async function createDirectory(dir: string, name: string): Promise<string> {
  if (!isTauriShell()) throw new Error("desktop-only");
  const { join } = await import("@tauri-apps/api/path");
  const { mkdir, exists } = await import("@tauri-apps/plugin-fs");
  const safe = name.trim() || "New Folder";
  const target = await uniqueSiblingPath(await join(dir, safe));
  if (await exists(target)) throw new Error("exists");
  await mkdir(target, { recursive: true });
  return target;
}

export async function deletePath(path: string): Promise<void> {
  if (!isTauriShell()) throw new Error("desktop-only");
  const { remove } = await import("@tauri-apps/plugin-fs");
  await remove(path, { recursive: true });
}

async function copyRecursive(from: string, to: string): Promise<void> {
  const { copyFile, mkdir, readDir, stat } = await import("@tauri-apps/plugin-fs");
  const { join } = await import("@tauri-apps/api/path");
  const info = await stat(from);
  if (info.isDirectory) {
    await mkdir(to, { recursive: true });
    const entries = await readDir(from);
    for (const entry of entries) {
      await copyRecursive(await join(from, entry.name), await join(to, entry.name));
    }
    return;
  }
  await copyFile(from, to);
}

export async function copyPathInto(source: string, destDir: string): Promise<string> {
  if (!isTauriShell()) throw new Error("desktop-only");
  const { join } = await import("@tauri-apps/api/path");
  const target = await uniqueSiblingPath(await join(destDir, basename(source)));
  await copyRecursive(source, target);
  return target;
}

export async function movePathInto(source: string, destDir: string): Promise<string> {
  if (!isTauriShell()) throw new Error("desktop-only");
  const { join } = await import("@tauri-apps/api/path");
  const { rename, exists } = await import("@tauri-apps/plugin-fs");
  const destParent = parentDir(source);
  const sameParent =
    destParent.replace(/\\/g, "/").toLowerCase() ===
    destDir.replace(/\\/g, "/").toLowerCase();
  const desired = await join(destDir, basename(source));
  const target = sameParent && !(await exists(desired))
    ? desired
    : await uniqueSiblingPath(desired);
  if (source.replace(/\\/g, "/").toLowerCase() === target.replace(/\\/g, "/").toLowerCase()) {
    return source;
  }
  await rename(source, target);
  return target;
}

export async function renamePath(source: string, newName: string): Promise<string> {
  if (!isTauriShell()) throw new Error("desktop-only");
  const safe = newName.trim();
  if (!safe || safe.includes("/") || safe.includes("\\")) {
    throw new Error("invalid-name");
  }
  const { join } = await import("@tauri-apps/api/path");
  const { rename, exists } = await import("@tauri-apps/plugin-fs");
  const target = await join(parentDir(source), safe);
  if (source.replace(/\\/g, "/").toLowerCase() === target.replace(/\\/g, "/").toLowerCase()) {
    return source;
  }
  if (await exists(target)) throw new Error("exists");
  await rename(source, target);
  return target;
}

export function explorerParentDir(path: string, folderRoot: string): string {
  const kindHint = path.replace(/[/\\]+$/, "");
  if (kindHint.replace(/\\/g, "/").toLowerCase() === folderRoot.replace(/\\/g, "/").toLowerCase()) {
    return folderRoot;
  }
  return parentDir(path);
}

export { basename as explorerBasename, parentDir as explorerParentOf };
