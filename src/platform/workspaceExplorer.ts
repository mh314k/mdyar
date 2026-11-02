import type { ExplorerNode } from "./desktopExplorer";
import { loadExplorerTree, pickDesktopWorkspaceFolder } from "./desktopExplorer";
import {
  clearWebWorkspaceFolder,
  loadWebExplorerTree,
  pickWebWorkspaceFolder,
  readWebExplorerFile,
  restoreWebWorkspaceFolder,
  webDirectoryPickerSupported,
} from "./webExplorer";
import type { OpenResult } from "./fs";

export { webDirectoryPickerSupported };

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
): Promise<ExplorerNode[]> {
  if (!root) return [];
  if (isDesktop) return loadExplorerTree(root);
  return loadWebExplorerTree(root);
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
