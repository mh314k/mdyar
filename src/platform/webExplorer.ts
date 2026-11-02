import type { ExplorerNode } from "./desktopExplorer";
import { isExplorerEditableFile } from "./desktopExplorer";
import { shouldSkipExplorerEntry, sortExplorerNodes } from "./explorerCommon";

const IDB_NAME = "mdyar-web-explorer";
const IDB_STORE = "folder";
const IDB_KEY = "workspace";

type DirHandle = FileSystemDirectoryHandle;

let cachedRoot: DirHandle | null = null;
let cachedRootLabel: string | null = null;

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

async function resolveDirHandle(relativeDir: string): Promise<DirHandle | null> {
  if (!cachedRoot) return null;
  const parts = relativeDir.split("/").filter(Boolean);
  let dir = cachedRoot;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  return dir;
}

/** List one web directory level (relative paths). */
export async function loadWebExplorerChildren(relativeDir = ""): Promise<ExplorerNode[]> {
  const dir = relativeDir ? await resolveDirHandle(relativeDir) : cachedRoot;
  if (!dir) return [];

  const nodes: ExplorerNode[] = [];
  const iterable = dir as DirHandle & {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  };

  for await (const [name, handle] of iterable.entries()) {
    if (shouldSkipExplorerEntry(name)) continue;
    const rel = relativeDir ? `${relativeDir}/${name}` : name;
    if (handle.kind === "directory") {
      nodes.push({
        kind: "dir",
        name,
        path: rel,
        children: [],
        childrenLoaded: false,
      });
    } else if (handle.kind === "file") {
      nodes.push({
        kind: "file",
        name,
        path: rel,
        editable: isExplorerEditableFile(name),
      });
    }
  }
  return sortExplorerNodes(nodes);
}

export async function loadWebExplorerTree(rootLabel: string | null): Promise<ExplorerNode[]> {
  if (!rootLabel) return [];
  if (!cachedRoot || cachedRootLabel !== rootLabel) {
    const ok = await restoreWebWorkspaceFolder(rootLabel);
    if (!ok || !cachedRoot) return [];
  }
  return loadWebExplorerChildren("");
}

export async function loadWebExplorerTreeHydrated(
  rootLabel: string | null,
  expandedDirs: ReadonlySet<string>,
): Promise<ExplorerNode[]> {
  const nodes = await loadWebExplorerTree(rootLabel);
  // Web loadExplorerChildren for nested uses relative path as dir key.
  return hydrateWebExpanded(nodes, expandedDirs);
}

async function hydrateWebExpanded(
  nodes: ExplorerNode[],
  expandedDirs: ReadonlySet<string>,
): Promise<ExplorerNode[]> {
  const out: ExplorerNode[] = [];
  for (const node of nodes) {
    if (node.kind !== "dir") {
      out.push(node);
      continue;
    }
    if (!expandedDirs.has(node.path)) {
      out.push({ ...node, children: [], childrenLoaded: false });
      continue;
    }
    const children = await loadWebExplorerChildren(node.path);
    const hydrated = await hydrateWebExpanded(children, expandedDirs);
    out.push({ ...node, children: hydrated, childrenLoaded: true });
  }
  return out;
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
