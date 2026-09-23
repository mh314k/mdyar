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
): Promise<SaveResult | null> {
  if (await isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    let target = path;
    if (!target) {
      const picked = await save({
        defaultPath: suggestedName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!picked) return null;
      target = picked;
    }
    await writeTextFile(target, content);
    const name = target.split(/[/\\]/).pop() ?? suggestedName;
    return { path: target, name };
  }

  // Web: download as file
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName.endsWith(".md") ? suggestedName : `${suggestedName}.md`;
  a.click();
  URL.revokeObjectURL(url);
  return { path: null, name: a.download };
}

export async function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function runningOnDesktop(): Promise<boolean> {
  return isTauri();
}

/**
 * TODO (roadmap): register .md file associations so double-click
 * opens MDyar with preview. Requires Tauri fileAssociations + deep link args.
 */
export function fileAssociationStub(): never {
  throw new Error("File association is planned — see README Roadmap");
}
