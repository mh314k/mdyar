import { useCallback, useEffect, useState } from "react";
import {
  loadSidebarPrefs,
  saveSidebarPrefs,
  type ActivityView,
  type SidebarPrefs,
} from "../activityView";

export function useSidebarPrefs() {
  const [sidebarPrefs, setSidebarPrefs] = useState<SidebarPrefs>(loadSidebarPrefs);

  useEffect(() => {
    saveSidebarPrefs(sidebarPrefs);
  }, [sidebarPrefs]);

  const selectActivityView = useCallback((view: ActivityView) => {
    setSidebarPrefs((current) => {
      if (current.view === view && current.open) {
        return { ...current, open: false };
      }
      return { open: true, view };
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarPrefs((current) => ({ ...current, open: !current.open }));
  }, []);

  return { sidebarPrefs, selectActivityView, toggleSidebar };
}
