/** Desktop workspace folder tree (Tauri only). Lazy: one directory level at a time. */

import { shouldSkipExplorerEntry, sortExplorerNodes } from "./explorerCommon";
import { isTauriShell } from "./fs";

export type ExplorerFileNode = {
  kind: "file";
  name: string;
  path: string;
  editable: boolean;
};

export type ExplorerDirNode = {
  kind: "dir";
  name: string;
  path: string;
  children: ExplorerNode[];
  /** false until this directory has been listed (lazy trees). */
  childrenLoaded: boolean;
};

export type ExplorerNode = ExplorerFileNode | ExplorerDirNode;

const EDITABLE_EXT = /\.(md|markdown|mdown|txt|text)$/i;

export function isExplorerEditableFile(name: string): boolean {
  return EDITABLE_EXT.test(name);
}

export async function pickDesktopWorkspaceFolder(): Promise<string | null> {
  try {
    if (!isTauriShell()) return null;
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    return selected;
  } catch {
    return null;
  }
}

/** List a single directory (files + unloaded child dirs). */
export async function loadExplorerChildren(dir: string): Promise<ExplorerNode[]> {
  if (!isTauriShell()) return [];

  const { readDir } = await import("@tauri-apps/plugin-fs");
  const { join } = await import("@tauri-apps/api/path");

  let entries;
  try {
    entries = await readDir(dir);
  } catch {
    return [];
  }

  const nodes: ExplorerNode[] = [];
  for (const entry of entries) {
    if (shouldSkipExplorerEntry(entry.name)) continue;
    const full = await join(dir, entry.name);
    if (entry.isDirectory) {
      nodes.push({
        kind: "dir",
        name: entry.name,
        path: full,
        children: [],
        childrenLoaded: false,
      });
    } else if (entry.isFile) {
      nodes.push({
        kind: "file",
        name: entry.name,
        path: full,
        editable: isExplorerEditableFile(entry.name),
      });
    }
  }
  return sortExplorerNodes(nodes);
}

export async function loadExplorerTree(root: string): Promise<ExplorerNode[]> {
  return loadExplorerChildren(root);
}

/** Re-list root, then rehydrate any currently expanded directories. */
export async function loadExplorerTreeHydrated(
  root: string,
  expandedDirs: ReadonlySet<string>,
): Promise<ExplorerNode[]> {
  const nodes = await loadExplorerChildren(root);
  return hydrateExpandedDirs(nodes, expandedDirs);
}

export async function hydrateExpandedDirs(
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
    const children = await loadExplorerChildren(node.path);
    const hydrated = await hydrateExpandedDirs(children, expandedDirs);
    out.push({ ...node, children: hydrated, childrenLoaded: true });
  }
  return out;
}

/** Patch one directory's children in an immutable tree. */
export function replaceExplorerChildren(
  nodes: ExplorerNode[],
  dirPath: string,
  children: ExplorerNode[],
): ExplorerNode[] {
  const key = dirPath.replace(/\\/g, "/").toLowerCase();
  return nodes.map((node) => {
    if (node.kind !== "dir") return node;
    if (node.path.replace(/\\/g, "/").toLowerCase() === key) {
      return { ...node, children, childrenLoaded: true };
    }
    if (!node.childrenLoaded || node.children.length === 0) return node;
    return {
      ...node,
      children: replaceExplorerChildren(node.children, dirPath, children),
    };
  });
}

export function folderDisplayName(root: string): string {
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? root;
}
