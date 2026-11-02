import type { ExplorerNode } from "../platform/desktopExplorer";
import { normalizeFsPath } from "./documents";

/** Folder node paths that must expand to reveal any open tab file in the tree. */
export function explorerDirsToReveal(
  nodes: ExplorerNode[],
  openFilePaths: ReadonlySet<string>,
): string[] {
  const dirs = new Set<string>();

  function walk(list: ExplorerNode[], ancestors: string[]): void {
    for (const node of list) {
      if (node.kind === "dir") {
        walk(node.children, [...ancestors, node.path]);
      } else if (openFilePaths.has(normalizeFsPath(node.path))) {
        for (const dir of ancestors) dirs.add(dir);
      }
    }
  }

  walk(nodes, []);
  return [...dirs];
}

export function mergeExpandedDirs(prev: Set<string>, dirPaths: Iterable<string>): Set<string> {
  const next = new Set(prev);
  for (const p of dirPaths) next.add(p);
  return next;
}
