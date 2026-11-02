import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ExplorerNode } from "../../platform/desktopExplorer";
import {
  closeWorkspaceFolder,
  folderExplorerAvailable,
  loadWorkspaceExplorerChildren,
  loadWorkspaceExplorerTree,
  pickWorkspaceFolder,
  readWorkspaceTextFile,
  replaceExplorerChildren,
  restoreWorkspaceFolder,
} from "../../platform/workspaceExplorer";
import {
  findDocumentByPath,
  mergeOpens,
  type WorkspaceSnapshot,
} from "../documents";
import { dirsToRevealForOpenFiles, mergeExpandedDirs } from "../explorerPaths";

type Options = {
  isDesktop: boolean;
  folderRoot: string | null;
  /** Raw on-disk paths of open tabs (not normalized). */
  openDiskPaths: readonly string[];
  setWorkspace: Dispatch<SetStateAction<WorkspaceSnapshot>>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useExplorer({
  isDesktop,
  folderRoot,
  openDiskPaths,
  setWorkspace,
  t,
}: Options) {
  const [explorerNodes, setExplorerNodes] = useState<ExplorerNode[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState(() => new Set<string>());
  const expandedRef = useRef(expandedDirs);
  expandedRef.current = expandedDirs;
  const loadingDirsRef = useRef(new Set<string>());

  useEffect(() => {
    setExpandedDirs(new Set());
  }, [folderRoot]);

  const refreshExplorerTree = useCallback(
    async (root: string | null) => {
      if (!root) {
        setExplorerNodes([]);
        setExplorerLoading(false);
        return;
      }
      setExplorerLoading(true);
      try {
        if (!isDesktop) {
          await restoreWorkspaceFolder(root, false);
        }
        const nodes = await loadWorkspaceExplorerTree(
          root,
          isDesktop,
          expandedRef.current,
        );
        setExplorerNodes(nodes);
      } catch {
        setExplorerNodes([]);
      } finally {
        setExplorerLoading(false);
      }
    },
    [isDesktop],
  );

  useEffect(() => {
    void refreshExplorerTree(folderRoot);
  }, [folderRoot, refreshExplorerTree]);

  const loadDirChildren = useCallback(
    async (dirPath: string) => {
      if (loadingDirsRef.current.has(dirPath)) return;
      loadingDirsRef.current.add(dirPath);
      try {
        const children = await loadWorkspaceExplorerChildren(dirPath, isDesktop);
        setExplorerNodes((prev) => replaceExplorerChildren(prev, dirPath, children));
      } finally {
        loadingDirsRef.current.delete(dirPath);
      }
    },
    [isDesktop],
  );

  const ensureExpanded = useCallback(
    (dirPaths: Iterable<string>) => {
      const list = [...dirPaths];
      if (list.length === 0) return;
      setExpandedDirs((prev) => mergeExpandedDirs(prev, list));
      void (async () => {
        for (const dir of list) {
          await loadDirChildren(dir);
        }
      })();
    },
    [loadDirChildren],
  );

  useEffect(() => {
    if (!folderRoot || openDiskPaths.length === 0) return;
    const reveal = dirsToRevealForOpenFiles(folderRoot, openDiskPaths);
    if (reveal.length === 0) return;
    ensureExpanded(reveal);
  }, [folderRoot, openDiskPaths, ensureExpanded]);

  const toggleDir = useCallback(
    (path: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
          return next;
        }
        next.add(path);
        return next;
      });
      // Always try load when expanding (no-op if already loaded & refresh not needed)
      setExplorerNodes((prev) => {
        const needsLoad = findDirNeedsLoad(prev, path);
        if (needsLoad) void loadDirChildren(path);
        return prev;
      });
    },
    [loadDirChildren],
  );

  const handleOpenFolder = useCallback(async () => {
    if (!folderExplorerAvailable(isDesktop)) {
      window.alert(t("dialogs.folderPickerUnsupported"));
      return;
    }
    const root = await pickWorkspaceFolder(isDesktop);
    if (!root) return;
    setWorkspace((ws) => ({ ...ws, folderRoot: root }));
  }, [isDesktop, setWorkspace, t]);

  const handleCloseFolder = useCallback(() => {
    void closeWorkspaceFolder(isDesktop);
    setWorkspace((ws) => ({ ...ws, folderRoot: null }));
  }, [isDesktop, setWorkspace]);

  const handleOpenExplorerFile = useCallback(
    async (path: string, documents: WorkspaceSnapshot["documents"]) => {
      const existing = findDocumentByPath(documents, path);
      if (existing) {
        setWorkspace((prev) => ({ ...prev, activeId: existing.id }));
        return;
      }
      const result = await readWorkspaceTextFile(path, isDesktop);
      if (!result) {
        window.alert(t("dialogs.openFailed", { name: path }));
        return;
      }
      setWorkspace((prev) => mergeOpens(prev, [result]));
    },
    [isDesktop, setWorkspace, t],
  );

  return {
    explorerNodes,
    explorerLoading,
    explorerEnabled: folderExplorerAvailable(isDesktop),
    expandedDirs,
    setExpandedDirs,
    toggleDir,
    ensureExpanded,
    refreshExplorerTree,
    handleOpenFolder,
    handleCloseFolder,
    handleOpenExplorerFile,
  };
}

function findDirNeedsLoad(nodes: ExplorerNode[], dirPath: string): boolean {
  const key = dirPath.replace(/\\/g, "/").toLowerCase();
  for (const node of nodes) {
    if (node.kind !== "dir") continue;
    if (node.path.replace(/\\/g, "/").toLowerCase() === key) {
      return !node.childrenLoaded;
    }
    if (node.childrenLoaded) {
      if (findDirNeedsLoad(node.children, dirPath)) return true;
    }
  }
  return false;
}
