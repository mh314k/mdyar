/** Interactive chrome that must not start a window drag. */
const NO_DRAG_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  '[role="menuitem"]',
  '[role="menu"]',
  '[data-tauri-drag-region="false"]',
  ".mdyar-menu",
  ".mdyar-window-controls",
].join(", ");

export function isWindowDragBlocked(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(NO_DRAG_SELECTOR));
}

/** Reliable drag for undecorated Tauri windows (WebView2 often ignores attribute-only regions). */
export async function startWindowDrag(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
}
