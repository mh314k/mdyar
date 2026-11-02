export type OpenResult = {
  content: string;
  path: string | null;
  name: string;
};

export type SaveResult = {
  path: string | null;
  name: string;
};

async function isTauri(): Promise<boolean> {
  try {
    const { isTauri: check } = await import("@tauri-apps/api/core");
    return check();
  } catch {
    return false;
  }
}

export function isTauriShell(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const MARKDOWN_FILTER = {
  name: "Markdown",
  extensions: ["md", "markdown", "mdown"],
};

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? "untitled.md";
}

export async function openMarkdownFiles(): Promise<OpenResult[]> {
  if (await isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: true,
      filters: [MARKDOWN_FILTER],
    });
    if (!selected) return [];
    const paths = Array.isArray(selected) ? selected : [selected];
    const results: OpenResult[] = [];
    for (const path of paths) {
      try {
        const content = await readTextFile(path);
        results.push({ content, path, name: basename(path) });
      } catch {
        // skip unreadable
      }
    }
    return results;
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".md,.markdown,.mdown,text/markdown";
    input.onchange = async () => {
      const files = input.files;
      if (!files?.length) {
        resolve([]);
        return;
      }
      const results: OpenResult[] = [];
      for (const file of Array.from(files)) {
        results.push({
          content: await file.text(),
          path: null,
          name: file.name,
        });
      }
      resolve(results);
    };
    input.click();
  });
}

async function listMarkdownInDirectoryTauri(root: string): Promise<string[]> {
  const { readDir } = await import("@tauri-apps/plugin-fs");
  const { join } = await import("@tauri-apps/api/path");
  const found: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readDir(dir);
    for (const entry of entries) {
      const full = await join(dir, entry.name);
      if (entry.isDirectory) {
        await walk(full);
      } else if (/\.(md|markdown|mdown)$/i.test(entry.name)) {
        found.push(full);
      }
    }
  }

  await walk(root);
  found.sort((a, b) => a.localeCompare(b));
  return found;
}

async function listMarkdownInDirectoryWeb(): Promise<{
  rootLabel: string;
  files: { name: string; content: string; relativePath: string }[];
} | null> {
  type DirHandle = FileSystemDirectoryHandle;
  const picker = (
    window as unknown as {
      showDirectoryPicker?: () => Promise<DirHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) return null;

  const root = await picker();
  const files: { name: string; content: string; relativePath: string }[] = [];

  async function walk(dir: DirHandle, prefix: string): Promise<void> {
    const iterable = dir as DirHandle & {
      entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
    };
    for await (const [name, handle] of iterable.entries()) {
      const rel = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === "directory") {
        await walk(handle as DirHandle, rel);
      } else if (/\.(md|markdown|mdown)$/i.test(name)) {
        const file = await (handle as FileSystemFileHandle).getFile();
        files.push({
          name,
          content: await file.text(),
          relativePath: rel,
        });
      }
    }
  }

  await walk(root, "");
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { rootLabel: root.name, files };
}

export type OpenFolderResult = {
  root: string | null;
  files: OpenResult[];
};

export async function openMarkdownFolder(): Promise<OpenFolderResult | null> {
  if (await isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    const paths = await listMarkdownInDirectoryTauri(selected);
    const files: OpenResult[] = [];
    for (const path of paths) {
      try {
        const content = await readTextFile(path);
        files.push({ content, path, name: basename(path) });
      } catch {
        // skip
      }
    }
    return { root: selected, files };
  }

  const web = await listMarkdownInDirectoryWeb();
  if (!web) return null;
  return {
    root: web.rootLabel,
    files: web.files.map((f) => ({
      content: f.content,
      path: null,
      name: f.relativePath,
    })),
  };
}

export async function writeMarkdownAtPath(path: string, content: string): Promise<void> {
  if (await isTauri()) {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(path, content);
    return;
  }
  throw new Error("writeMarkdownAtPath is desktop-only");
}

export async function openMarkdownFile(): Promise<OpenResult | null> {
  const batch = await openMarkdownFiles();
  return batch[0] ?? null;
}

export async function saveMarkdownFile(
  content: string,
  path: string | null,
  suggestedName = "untitled.md",
  saveAs = false,
): Promise<SaveResult | null> {
  if (await isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    let target = saveAs ? null : path;
    if (!target) {
      const picked = await save({
        defaultPath: path ?? suggestedName,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown"] }],
      });
      if (!picked) return null;
      target = /\.(md|markdown|mdown)$/i.test(picked) ? picked : `${picked}.md`;
    }
    await writeTextFile(target, content);
    const name = target.split(/[/\\]/).pop() ?? suggestedName;
    return { path: target, name };
  }

  const webName = /\.(md|markdown|mdown)$/i.test(suggestedName)
    ? suggestedName
    : `${suggestedName}.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  await downloadBlob(webName, blob);
  return { path: null, name: webName };
}

export async function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Desktop WebView ignores `<a download>`, so HTML is written through the save dialog. */
export async function saveTextDocument(
  content: string,
  suggestedName: string,
  filter: { name: string; extensions: string[] },
  mime = "text/plain;charset=utf-8",
): Promise<SaveResult | null> {
  const extension = filter.extensions[0] ?? "txt";
  const name = suggestedName.toLowerCase().endsWith(`.${extension}`)
    ? suggestedName
    : `${suggestedName}.${extension}`;

  if (await isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const picked = await save({
      defaultPath: name,
      filters: [filter],
    });
    if (!picked) return null;
    const target = picked.toLowerCase().endsWith(`.${extension}`)
      ? picked
      : `${picked}.${extension}`;
    await writeTextFile(target, content);
    const fileName = target.split(/[/\\]/).pop() ?? name;
    return { path: target, name: fileName };
  }

  const blob = new Blob([content], { type: mime });
  await downloadBlob(name, blob);
  return { path: null, name };
}

export async function saveBinaryDocument(
  data: Uint8Array,
  suggestedName: string,
  filter: { name: string; extensions: string[] },
  mime: string,
): Promise<SaveResult | null> {
  const extension = filter.extensions[0] ?? "bin";
  const name = suggestedName.toLowerCase().endsWith(`.${extension}`)
    ? suggestedName
    : `${suggestedName}.${extension}`;

  if (await isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const picked = await save({
      defaultPath: name,
      filters: [filter],
    });
    if (!picked) return null;
    const target = picked.toLowerCase().endsWith(`.${extension}`)
      ? picked
      : `${picked}.${extension}`;
    await writeFile(target, data);
    const fileName = target.split(/[/\\]/).pop() ?? name;
    return { path: target, name: fileName };
  }

  const blob = new Blob([data], { type: mime });
  await downloadBlob(name, blob);
  return { path: null, name };
}

export async function runningOnDesktop(): Promise<boolean> {
  return isTauri();
}

/** Open an https URL in the system browser (desktop) or a new tab (web). */
export async function openExternalUrl(url: string): Promise<void> {
  if (await isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function readMarkdownAtPath(path: string): Promise<OpenResult | null> {
  return readTextAtPath(path);
}

/** Read a text file from disk (desktop). */
export async function readTextAtPath(path: string): Promise<OpenResult | null> {
  if (!(await isTauri())) return null;
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const content = await readTextFile(path);
    const name = basename(path);
    return { content, path, name };
  } catch {
    return null;
  }
}

/** Fires when the OS opens a markdown file while MDyar is already running. */
export async function listenForOsOpen(onSignal: () => void): Promise<() => void> {
  if (!(await isTauri())) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen("mdyar-open-file", () => {
    onSignal();
  });
}

/** Paths queued before the UI was listening, including the file that launched the app. */
export async function drainOsOpenPaths(): Promise<string[]> {
  if (!(await isTauri())) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string[]>("drain_open_paths");
}
