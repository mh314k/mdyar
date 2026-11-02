import type { MdyarDocument, WorkspaceSnapshot } from "../app/documents";
import { createDocument } from "../app/documents";
import type { ViewMode } from "../app/viewMode";
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
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    if (!Array.isArray(parsed.documents)) {
      return null;
    }
    const rawDocs = parsed.documents as unknown[];
    const documents = rawDocs
      .filter(
        (d): d is RawDoc =>
          typeof d === "object" &&
          d !== null &&
          typeof (d as RawDoc).id === "string" &&
          typeof (d as RawDoc).content === "string" &&
          typeof (d as RawDoc).fileName === "string",
      )
      .map((d) =>
        createDocument({
          id: d.id,
          content: d.content,
          fileName: d.fileName,
          filePath: typeof d.filePath === "string" ? d.filePath : null,
          dirty: Boolean(d.dirty),
          viewMode: validView(d.viewMode),
        }),
      );
    if (documents.length === 0) {
      return {
        documents: [],
        activeId: null,
        folderRoot: typeof parsed.folderRoot === "string" ? parsed.folderRoot : null,
      };
    }
    const activeId = parseWorkspaceActiveId(documents, parsed.activeId);
    return {
      documents,
      activeId,
      folderRoot: typeof parsed.folderRoot === "string" ? parsed.folderRoot : null,
    };
  } catch {
    return null;
  }
}

type RawDoc = {
  id: string;
  content: string;
  fileName: string;
  filePath?: string | null;
  dirty?: boolean;
  viewMode?: ViewMode;
};

function validView(mode: unknown): ViewMode {
  return mode === "preview" || mode === "split" || mode === "edit" ? mode : "preview";
}

function parseWorkspaceActiveId(
  documents: MdyarDocument[],
  rawActiveId: unknown,
): string | null {
  if (documents.length === 0) return null;
  if (typeof rawActiveId === "string" && documents.some((d) => d.id === rawActiveId)) {
    return rawActiveId;
  }
  return documents[0]?.id ?? null;
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

/** Writes dirty content to disk path or app-data draft; clears dirty on success. */
export async function autosaveDocument(
  doc: MdyarDocument,
): Promise<MdyarDocument | null> {
  if (!isTauriShell()) return null;
  if (!doc.dirty) return doc;
  try {
    const { join } = await import("@tauri-apps/api/path");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    let target = doc.filePath;
    if (!target) {
      const root = await sessionDir();
      target = await join(root, "drafts", `${doc.id}.md`);
    }
    await writeTextFile(target, doc.content);
    return {
      ...doc,
      filePath: target,
      dirty: false,
    };
  } catch {
    return null;
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
