import type { WorkspaceSnapshot } from "../app/documents";
import { createDocument, parseWorkspaceSnapshot } from "../app/documents";
import { isWebShell, loadWebDocument, type WebDocumentSnapshot } from "./webDocument";

const STORAGE_KEY = "mdyar.webWorkspace";

function migrateLegacy(snapshot: WebDocumentSnapshot): WorkspaceSnapshot {
  const doc = createDocument({
    content: snapshot.content,
    fileName: snapshot.fileName,
    viewMode: snapshot.viewMode,
    dirty: snapshot.dirty,
  });
  return { documents: [doc], activeId: doc.id, folderRoot: null };
}

export function loadWebWorkspace(): WorkspaceSnapshot | null {
  if (!isWebShell()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return parseWorkspaceSnapshot(JSON.parse(raw));
    }
    const legacy = loadWebDocument();
    if (legacy) return migrateLegacy(legacy);
    return null;
  } catch {
    return null;
  }
}

export function saveWebWorkspace(snapshot: WorkspaceSnapshot): void {
  if (!isWebShell()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // best-effort
  }
}
