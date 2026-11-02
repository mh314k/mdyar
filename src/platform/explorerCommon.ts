type SortableExplorerNode = { kind: "file" | "dir"; name: string };

export function shouldSkipExplorerEntry(name: string): boolean {
  return name.startsWith(".");
}

export function sortExplorerNodes<T extends SortableExplorerNode>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}
