export type ActivityView = "explorer" | "settings";

const SIDEBAR_KEY = "mdyar.sidebar";

export type SidebarPrefs = {
  open: boolean;
  view: ActivityView;
};

export function loadSidebarPrefs(): SidebarPrefs {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (!raw) return { open: true, view: "explorer" };
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs> & { view?: string };
    let view: ActivityView = "explorer";
    const viewRaw = String(parsed.view ?? "");
    if (viewRaw === "settings" || viewRaw === "manage") view = "settings";
    else if (viewRaw === "explorer" || viewRaw === "view") view = "explorer";
    return { open: parsed.open !== false, view };
  } catch {
    return { open: true, view: "explorer" };
  }
}

export function saveSidebarPrefs(prefs: SidebarPrefs): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
