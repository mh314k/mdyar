import type { ExplorerNode } from "./desktopExplorer";
import {
  loadExplorerChildren,
  loadExplorerTreeHydrated,
  pickDesktopWorkspaceFolder,
  replaceExplorerChildren,
} from "./desktopExplorer";
import {
  clearWebWorkspaceFolder,
  loadWebExplorerChildren,
  loadWebExplorerTreeHydrated,
  pickWebWorkspaceFolder,
  readWebExplorerFile,
  restoreWebWorkspaceFolder,
  webDirectoryPickerSupported,
} from "./webExplorer";
import type { OpenResult } from "./fs";

export { webDirectoryPickerSupported, replaceExplorerChildren };

export function folderExplorerAvailable(isDesktop: boolean): boolean {
  return isDesktop || webDirectoryPickerSupported();
}

export async function pickWorkspaceFolder(isDesktop: boolean): Promise<string | null> {
  if (isDesktop) return pickDesktopWorkspaceFolder();
  return pickWebWorkspaceFolder();
}

export async function loadWorkspaceExplorerTree(
  root: string | null,
  isDesktop: boolean,
  expandedDirs: ReadonlySet<string> = new Set(),
): Promise<ExplorerNode[]> {
  if (!root) return [];
  if (isDesktop) return loadExplorerTreeHydrated(root, expandedDirs);
  return loadWebExplorerTreeHydrated(root, expandedDirs);
}

export async function loadWorkspaceExplorerChildren(
  dirPath: string,
  isDesktop: boolean,
): Promise<ExplorerNode[]> {
  if (isDesktop) return loadExplorerChildren(dirPath);
  return loadWebExplorerChildren(dirPath);
}

export async function restoreWorkspaceFolder(
  root: string | null,
  isDesktop: boolean,
): Promise<boolean> {
  if (!root || isDesktop) return Boolean(root);
  return restoreWebWorkspaceFolder(root);
}

export async function closeWorkspaceFolder(isDesktop: boolean): Promise<void> {
  if (!isDesktop) await clearWebWorkspaceFolder();
}

export async function readWorkspaceTextFile(
  path: string,
  isDesktop: boolean,
): Promise<OpenResult | null> {
  if (isDesktop) {
    const { readTextAtPath } = await import("./fs");
    return readTextAtPath(path);
  }
  const web = await readWebExplorerFile(path);
  if (!web) return null;
  return web;
}
