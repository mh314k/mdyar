import type { WorkspaceSnapshot } from "../app/documents";
import { createDocument, type MdyarDocument } from "../app/documents";
import type { ViewMode } from "../app/viewMode";
import { loadWebDocument, type WebDocumentSnapshot } from "./webDocument";

const STORAGE_KEY = "mdyar.webWorkspace";

export function isWebShell(): boolean {
  return typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);
}

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
      const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
      if (!Array.isArray(parsed.documents)) {
        return null;
      }
      const rawDocs = parsed.documents as unknown[];
      const documents = rawDocs
        .filter(
          (d): d is MdyarDocumentLike =>
            typeof d === "object" &&
            d !== null &&
            typeof (d as MdyarDocumentLike).id === "string" &&
            typeof (d as MdyarDocumentLike).content === "string" &&
            typeof (d as MdyarDocumentLike).fileName === "string",
        )
        .map((d) =>
          createDocument({
            id: d.id,
            content: d.content,
            fileName: d.fileName,
            filePath: typeof d.filePath === "string" ? d.filePath : null,
            dirty: Boolean(d.dirty),
            viewMode: validViewMode(d.viewMode),
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
    }
    const legacy = loadWebDocument();
    if (legacy) return migrateLegacy(legacy);
    return null;
  } catch {
    return null;
  }
}

type MdyarDocumentLike = {
  id: string;
  content: string;
  fileName: string;
  filePath?: string | null;
  dirty?: boolean;
  viewMode?: ViewMode;
};

function validViewMode(mode: unknown): ViewMode {
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

export function saveWebWorkspace(snapshot: WorkspaceSnapshot): void {
  if (!isWebShell()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // best-effort
  }
}
