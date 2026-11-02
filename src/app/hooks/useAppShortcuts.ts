import { useEffect, type MutableRefObject } from "react";
import { folderExplorerAvailable } from "../../platform/workspaceExplorer";
import type { WorkspaceSnapshot } from "../documents";

type Options = {
  aboutOpen: boolean;
  themesOpen: boolean;
  isDesktop: boolean;
  setAboutOpen: (open: boolean) => void;
  setThemesOpen: (open: boolean) => void;
  saveRef: MutableRefObject<(saveAs?: boolean) => Promise<boolean>>;
  workspaceRef: MutableRefObject<WorkspaceSnapshot>;
  handleNew: () => void;
  handleOpen: () => void | Promise<void>;
  handleOpenFolder: () => void | Promise<void>;
  handleCloseTab: (id: string) => void | Promise<void>;
  toggleSidebar: () => void;
};

export function useAppShortcuts({
  aboutOpen,
  themesOpen,
  isDesktop,
  setAboutOpen,
  setThemesOpen,
  saveRef,
  workspaceRef,
  handleNew,
  handleOpen,
  handleOpenFolder,
  handleCloseTab,
  toggleSidebar,
}: Options) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (aboutOpen) {
          setAboutOpen(false);
          e.preventDefault();
          return;
        }
        if (themesOpen) {
          setThemesOpen(false);
          e.preventDefault();
          return;
        }
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === "s") {
        e.preventDefault();
        void saveRef.current(e.shiftKey && isDesktop);
      } else if (key === "o" && e.shiftKey) {
        if (!folderExplorerAvailable(isDesktop)) return;
        e.preventDefault();
        void handleOpenFolder();
      } else if (key === "o" && !e.shiftKey) {
        e.preventDefault();
        void handleOpen();
      } else if (key === "n" && !e.shiftKey) {
        e.preventDefault();
        handleNew();
      } else if (key === "w" && !e.shiftKey) {
        e.preventDefault();
        const tabId = workspaceRef.current.activeId;
        if (tabId) void handleCloseTab(tabId);
      } else if (key === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    aboutOpen,
    themesOpen,
    isDesktop,
    setAboutOpen,
    setThemesOpen,
    saveRef,
    workspaceRef,
    handleNew,
    handleOpen,
    handleOpenFolder,
    handleCloseTab,
    toggleSidebar,
  ]);
}
