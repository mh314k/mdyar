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

export async function openMarkdownFile(): Promise<OpenResult | null> {
  if (await isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown"] }],
    });
    if (!selected || Array.isArray(selected)) return null;
    const content = await readTextFile(selected);
    const name = selected.split(/[/\\]/).pop() ?? "untitled.md";
    return { content, path: selected, name };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.mdown,text/markdown";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const content = await file.text();
      resolve({ content, path: null, name: file.name });
    };
    input.click();
  });
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
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!picked) return null;
      target = picked.toLowerCase().endsWith(".md") ? picked : `${picked}.md`;
    }
    await writeTextFile(target, content);
    const name = target.split(/[/\\]/).pop() ?? suggestedName;
    return { path: target, name };
  }

  const webName = suggestedName.endsWith(".md") ? suggestedName : `${suggestedName}.md`;
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

export async function runningOnDesktop(): Promise<boolean> {
  return isTauri();
}

export async function readMarkdownAtPath(path: string): Promise<OpenResult | null> {
  if (!(await isTauri())) return null;
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const content = await readTextFile(path);
    const name = path.split(/[/\\]/).pop() ?? "untitled.md";
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
