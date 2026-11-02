import { normalizeFsPath } from "./documents";

/**
 * Ancestor folders between workspace root and a file path (path-based, works with lazy trees).
 */
export function ancestorDirsBetween(root: string, filePath: string): string[] {
  const rootKey = normalizeFsPath(root).replace(/\/$/, "");
  const fileKey = normalizeFsPath(filePath);
  if (fileKey === rootKey || !fileKey.startsWith(`${rootKey}/`)) return [];

  const sep = root.includes("\\") ? "\\" : "/";
  const rootParts = root.replace(/[/\\]+$/, "").split(/[/\\]/).filter(Boolean);
  const fileParts = filePath.split(/[/\\]/).filter(Boolean);
  if (fileParts.length <= rootParts.length + 1) return [];

  const dirs: string[] = [];
  let current = root.replace(/[/\\]+$/, "");
  for (let i = rootParts.length; i < fileParts.length - 1; i++) {
    current = `${current}${sep}${fileParts[i]}`;
    dirs.push(current);
  }
  return dirs;
}

export function dirsToRevealForOpenFiles(
  folderRoot: string,
  openFilePaths: Iterable<string>,
): string[] {
  const dirs = new Set<string>();
  for (const path of openFilePaths) {
    for (const dir of ancestorDirsBetween(folderRoot, path)) {
      dirs.add(dir);
    }
  }
  return [...dirs];
}

export function mergeExpandedDirs(prev: Set<string>, dirPaths: Iterable<string>): Set<string> {
  const next = new Set(prev);
  for (const p of dirPaths) next.add(p);
  return next;
}
