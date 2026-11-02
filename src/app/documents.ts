import type { ViewMode } from "./viewMode";

export type MdyarDocument = {
  id: string;
  content: string;
  fileName: string;
  filePath: string | null;
  dirty: boolean;
  viewMode: ViewMode;
};

export type WorkspaceSnapshot = {
  documents: MdyarDocument[];
  activeId: string | null;
  folderRoot: string | null;
};

export function createDocument(
  partial: Partial<MdyarDocument> & Pick<MdyarDocument, "content" | "fileName">,
): MdyarDocument {
  return {
    id: partial.id ?? crypto.randomUUID(),
    content: partial.content,
    fileName: partial.fileName,
    filePath: partial.filePath ?? null,
    dirty: partial.dirty ?? false,
    viewMode: partial.viewMode ?? "preview",
  };
}

export function getActiveDocument(
  workspace: WorkspaceSnapshot,
): MdyarDocument | undefined {
  if (!workspace.activeId) return undefined;
  return workspace.documents.find((d) => d.id === workspace.activeId);
}

export function normalizeFsPath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

export function findDocumentByPath(
  documents: MdyarDocument[],
  path: string | null,
): MdyarDocument | undefined {
  if (!path) return undefined;
  const key = normalizeFsPath(path);
  return documents.find((d) => d.filePath && normalizeFsPath(d.filePath) === key);
}
