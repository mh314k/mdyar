const STORAGE_KEY = "mdyar.webDocument";

export type WebDocumentSnapshot = {
  content: string;
  fileName: string;
  viewMode: "preview" | "split" | "edit";
  dirty: boolean;
};

export function isWebShell(): boolean {
  return typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);
}

export function loadWebDocument(): WebDocumentSnapshot | null {
  if (!isWebShell()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WebDocumentSnapshot>;
    if (typeof parsed.content !== "string" || typeof parsed.fileName !== "string") {
      return null;
    }
    const viewMode = parsed.viewMode;
    const validView =
      viewMode === "preview" || viewMode === "split" || viewMode === "edit"
        ? viewMode
        : "preview";
    return {
      content: parsed.content,
      fileName: parsed.fileName,
      viewMode: validView,
      dirty: Boolean(parsed.dirty),
    };
  } catch {
    return null;
  }
}

export function saveWebDocument(snapshot: WebDocumentSnapshot): void {
  if (!isWebShell()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage full or disabled — session restore is best-effort on web
  }
}
