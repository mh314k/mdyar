import type { MdyarDocument, WorkspaceSnapshot } from "../app/documents";
import { parseWorkspaceSnapshot } from "../app/documents";
import { isTauriShell } from "./fs";

const WORKSPACE_FILE = "workspace.json";

async function sessionDir(): Promise<string> {
  const { appDataDir, join } = await import("@tauri-apps/api/path");
  const { mkdir, exists } = await import("@tauri-apps/plugin-fs");
  const root = await join(await appDataDir(), "mdyar");
  if (!(await exists(root))) {
    await mkdir(root, { recursive: true });
  }
  const drafts = await join(root, "drafts");
  if (!(await exists(drafts))) {
    await mkdir(drafts, { recursive: true });
  }
  return root;
}

export async function loadDesktopWorkspace(): Promise<WorkspaceSnapshot | null> {
  if (!isTauriShell()) return null;
  try {
    const { join } = await import("@tauri-apps/api/path");
    const { readTextFile, exists } = await import("@tauri-apps/plugin-fs");
    const root = await sessionDir();
    const path = await join(root, WORKSPACE_FILE);
    if (!(await exists(path))) return null;
    const raw = await readTextFile(path);
    return parseWorkspaceSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveDesktopWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  if (!isTauriShell()) return;
  try {
    const { join } = await import("@tauri-apps/api/path");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const root = await sessionDir();
    const path = await join(root, WORKSPACE_FILE);
    await writeTextFile(path, JSON.stringify(snapshot));
  } catch {
    // best-effort
  }
}

/** Backup draft bytes without mutating the in-memory document. */
async function backupDraftFile(doc: MdyarDocument): Promise<void> {
  if (!doc.dirty) return;
  try {
    const { join } = await import("@tauri-apps/api/path");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const root = await sessionDir();
    const target =
      doc.filePath ?? (await join(root, "drafts", `${doc.id}.md`));
    await writeTextFile(target, doc.content);
  } catch {
    // best-effort backup
  }
}

/** Persist open tabs for next launch; backup dirty content without clearing dirty flags. */
export async function flushDesktopSession(snapshot: WorkspaceSnapshot): Promise<void> {
  if (!isTauriShell()) return;
  await saveDesktopWorkspace(snapshot);
  await Promise.all(snapshot.documents.map((doc) => backupDraftFile(doc)));
}
