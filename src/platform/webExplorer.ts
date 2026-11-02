import type { ExplorerNode } from "./desktopExplorer";
import { isExplorerEditableFile } from "./desktopExplorer";

const IDB_NAME = "mdyar-web-explorer";
const IDB_STORE = "folder";
const IDB_KEY = "workspace";

type DirHandle = FileSystemDirectoryHandle;

let cachedRoot: DirHandle | null = null;
let cachedRootLabel: string | null = null;

function shouldSkipEntry(name: string): boolean {
  return name.startsWith(".");
}

function sortNodes(nodes: ExplorerNode[]): ExplorerNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function webDirectoryPickerSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function persistHandle(handle: DirHandle, label: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ handle, label }, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadPersistedHandle(): Promise<{ handle: DirHandle; label: string } | null> {
  try {
    const db = await openDb();
    const row = await new Promise<{ handle: DirHandle; label: string } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result as { handle: DirHandle; label: string } | undefined);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (!row?.handle || typeof row.label !== "string") return null;
    return row;
  } catch {
    return null;
  }
}

async function clearPersistedHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

type DirHandleWithPermission = DirHandle & {
  queryPermission(descriptor: { mode: "read" }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: "read" }): Promise<PermissionState>;
};

async function ensureReadPermission(handle: DirHandle): Promise<boolean> {
  try {
    const fsHandle = handle as DirHandleWithPermission;
    const perm = await fsHandle.queryPermission({ mode: "read" });
    if (perm === "granted") return true;
    const next = await fsHandle.requestPermission({ mode: "read" });
    return next === "granted";
  } catch {
    return false;
  }
}

export async function pickWebWorkspaceFolder(): Promise<string | null> {
  if (!webDirectoryPickerSupported()) return null;
  try {
    const picker = (
      window as unknown as { showDirectoryPicker: () => Promise<DirHandle> }
    ).showDirectoryPicker;
    const handle = await picker();
    if (!(await ensureReadPermission(handle))) return null;
    cachedRoot = handle;
    cachedRootLabel = handle.name;
    await persistHandle(handle, handle.name);
    return handle.name;
  } catch {
    return null;
  }
}

export async function restoreWebWorkspaceFolder(rootLabel: string): Promise<boolean> {
  if (cachedRoot && cachedRootLabel === rootLabel) return true;
  const stored = await loadPersistedHandle();
  if (!stored || stored.label !== rootLabel) return false;
  if (!(await ensureReadPermission(stored.handle))) return false;
  cachedRoot = stored.handle;
  cachedRootLabel = stored.label;
  return true;
}

export async function clearWebWorkspaceFolder(): Promise<void> {
  cachedRoot = null;
  cachedRootLabel = null;
  await clearPersistedHandle();
}

async function walkDirectory(dir: DirHandle, relPrefix: string): Promise<ExplorerNode[]> {
  const nodes: ExplorerNode[] = [];
  const iterable = dir as DirHandle & {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  };

  for await (const [name, handle] of iterable.entries()) {
    if (shouldSkipEntry(name)) continue;
    const rel = relPrefix ? `${relPrefix}/${name}` : name;
    if (handle.kind === "directory") {
      const children = await walkDirectory(handle as DirHandle, rel);
      nodes.push({ kind: "dir", name, path: rel, children });
    } else if (handle.kind === "file") {
      nodes.push({
        kind: "file",
        name,
        path: rel,
        editable: isExplorerEditableFile(name),
      });
    }
  }
  return sortNodes(nodes);
}

export async function loadWebExplorerTree(rootLabel: string | null): Promise<ExplorerNode[]> {
  if (!rootLabel) return [];
  if (!cachedRoot || cachedRootLabel !== rootLabel) {
    const ok = await restoreWebWorkspaceFolder(rootLabel);
    if (!ok || !cachedRoot) return [];
  }
  return walkDirectory(cachedRoot, "");
}

export async function readWebExplorerFile(relativePath: string): Promise<{
  content: string;
  path: string;
  name: string;
} | null> {
  if (!cachedRoot) return null;
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  let dir = cachedRoot;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]!);
  }
  const fileName = parts[parts.length - 1]!;
  const fileHandle = await dir.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return {
    content: await file.text(),
    path: relativePath,
    name: fileName,
  };
}

export function isWebWorkspacePath(path: string): boolean {
  if (/^[a-zA-Z]:[/\\]/.test(path)) return false;
  if (path.startsWith("/") || path.startsWith("\\")) return false;
  return true;
}
