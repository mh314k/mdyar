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

type OpenLike = {
  content: string;
  path: string | null;
  name: string;
};

type RawDoc = {
  id: string;
  content: string;
  fileName: string;
  filePath?: string | null;
  dirty?: boolean;
  viewMode?: ViewMode;
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

function pathFileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/** Remap open-tab paths after a file/folder move or rename. */
export function remapWorkspacePaths(
  workspace: WorkspaceSnapshot,
  from: string,
  to: string,
): WorkspaceSnapshot {
  const fromKey = normalizeFsPath(from);
  const fromPrefix = fromKey.endsWith("/") ? fromKey : `${fromKey}/`;
  return {
    ...workspace,
    documents: workspace.documents.map((doc) => {
      if (!doc.filePath) return doc;
      const key = normalizeFsPath(doc.filePath);
      if (key === fromKey) {
        return { ...doc, filePath: to, fileName: pathFileName(to) };
      }
      if (key.startsWith(fromPrefix)) {
        const rest = doc.filePath.slice(from.length).replace(/^[/\\]+/, "");
        const sep = to.includes("\\") ? "\\" : "/";
        const nextPath = `${to.replace(/[/\\]+$/, "")}${sep}${rest}`;
        return { ...doc, filePath: nextPath, fileName: pathFileName(nextPath) };
      }
      return doc;
    }),
  };
}

/** Drop or detach tabs whose files were deleted (path or under a deleted folder). */
export function removeWorkspacePaths(
  workspace: WorkspaceSnapshot,
  removedPath: string,
): WorkspaceSnapshot {
  const removedKey = normalizeFsPath(removedPath);
  const removedPrefix = removedKey.endsWith("/") ? removedKey : `${removedKey}/`;
  const documents = workspace.documents.filter((doc) => {
    if (!doc.filePath) return true;
    const key = normalizeFsPath(doc.filePath);
    return key !== removedKey && !key.startsWith(removedPrefix);
  });
  if (documents.length === workspace.documents.length) return workspace;
  const activeStillOpen =
    workspace.activeId !== null && documents.some((d) => d.id === workspace.activeId);
  return {
    ...workspace,
    documents,
    activeId: activeStillOpen
      ? workspace.activeId
      : documents[documents.length - 1]?.id ?? null,
  };
}

export function validViewMode(mode: unknown): ViewMode {
  return mode === "preview" || mode === "split" || mode === "edit" ? mode : "preview";
}

export function patchActiveDoc(
  workspace: WorkspaceSnapshot,
  patch: Partial<MdyarDocument>,
): WorkspaceSnapshot {
  if (!workspace.activeId) return workspace;
  return {
    ...workspace,
    documents: workspace.documents.map((d) =>
      d.id === workspace.activeId ? { ...d, ...patch } : d,
    ),
  };
}

export function mergeOpens(
  workspace: WorkspaceSnapshot,
  results: OpenLike[],
  folderRoot?: string | null,
): WorkspaceSnapshot {
  if (results.length === 0) return workspace;
  let documents = [...workspace.documents];
  let activeId = workspace.activeId;
  for (const result of results) {
    const existing = findDocumentByPath(documents, result.path);
    if (existing) {
      activeId = existing.id;
      continue;
    }
    const doc = createDocument({
      content: result.content,
      fileName: result.name,
      filePath: result.path,
      dirty: false,
      viewMode: "preview",
    });
    documents.push(doc);
    activeId = doc.id;
  }
  return {
    documents,
    activeId,
    folderRoot: folderRoot === undefined ? workspace.folderRoot : folderRoot,
  };
}

export function removeDocumentFromWorkspace(
  workspace: WorkspaceSnapshot,
  id: string,
): WorkspaceSnapshot {
  if (workspace.documents.length === 1) {
    return { documents: [], activeId: null, folderRoot: workspace.folderRoot };
  }
  const index = workspace.documents.findIndex((d) => d.id === id);
  const remaining = workspace.documents.filter((d) => d.id !== id);
  const nextActive =
    workspace.activeId === id
      ? remaining[Math.min(index, remaining.length - 1)]?.id ?? remaining[0]?.id ?? null
      : workspace.activeId;
  return { ...workspace, documents: remaining, activeId: nextActive };
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

/** Shared JSON → workspace decode for desktop session + web localStorage. */
export function parseWorkspaceSnapshot(raw: unknown): WorkspaceSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const parsed = raw as Partial<WorkspaceSnapshot>;
  if (!Array.isArray(parsed.documents)) return null;

  const documents = (parsed.documents as unknown[])
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
        viewMode: validViewMode(d.viewMode),
      }),
    );

  const folderRoot = typeof parsed.folderRoot === "string" ? parsed.folderRoot : null;
  if (documents.length === 0) {
    return { documents: [], activeId: null, folderRoot };
  }
  return {
    documents,
    activeId: parseWorkspaceActiveId(documents, parsed.activeId),
    folderRoot,
  };
}
