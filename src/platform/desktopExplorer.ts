/** Desktop workspace folder tree (Tauri only). */

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
};

export type ExplorerNode = ExplorerFileNode | ExplorerDirNode;

const EDITABLE_EXT = /\.(md|markdown|mdown|txt|text)$/i;

export function isExplorerEditableFile(name: string): boolean {
  return EDITABLE_EXT.test(name);
}

export function explorerFileIcon(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(md|markdown|mdown)$/.test(lower)) return "markdown";
  if (/\.(txt|text|log)$/.test(lower)) return "text_snippet";
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(lower)) return "image";
  if (/\.(pdf)$/.test(lower)) return "picture_as_pdf";
  if (/\.(json|yaml|yml|toml|xml)$/.test(lower)) return "data_object";
  if (/\.(html?|css|scss|sass|less)$/.test(lower)) return "html";
  if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(lower)) return "javascript";
  if (/\.(py|rb|go|rs|java|kt|cs|cpp|c|h|swift)$/.test(lower)) return "code";
  if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return "folder_zip";
  if (/\.(doc|docx)$/.test(lower)) return "description";
  if (/\.(mp3|wav|ogg|flac)$/.test(lower)) return "audio_file";
  if (/\.(mp4|webm|mov|avi|mkv)$/.test(lower)) return "video_file";
  return "insert_drive_file";
}

function shouldSkipEntry(name: string): boolean {
  return name.startsWith(".");
}

function sortNodes(nodes: ExplorerNode[]): ExplorerNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export async function pickDesktopWorkspaceFolder(): Promise<string | null> {
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    if (!isTauri()) return null;
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    return selected;
  } catch {
    return null;
  }
}

export async function loadExplorerTree(root: string): Promise<ExplorerNode[]> {
  const { isTauri } = await import("@tauri-apps/api/core");
  if (!isTauri()) return [];

  const { readDir } = await import("@tauri-apps/plugin-fs");
  const { join } = await import("@tauri-apps/api/path");

  async function walk(dir: string): Promise<ExplorerNode[]> {
    let entries;
    try {
      entries = await readDir(dir);
    } catch {
      return [];
    }

    const nodes: ExplorerNode[] = [];
    for (const entry of entries) {
      if (shouldSkipEntry(entry.name)) continue;
      const full = await join(dir, entry.name);
      if (entry.isDirectory) {
        const children = await walk(full);
        nodes.push({ kind: "dir", name: entry.name, path: full, children });
      } else if (entry.isFile) {
        nodes.push({
          kind: "file",
          name: entry.name,
          path: full,
          editable: isExplorerEditableFile(entry.name),
        });
      }
    }
    return sortNodes(nodes);
  }

  return walk(root);
}

export function folderDisplayName(root: string): string {
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? root;
}
