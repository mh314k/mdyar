import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MarkdownEditor,
  type EditorScrollHandle,
} from "../editor/MarkdownEditor";
import {
  MarkdownPreview,
  type PreviewScrollHandle,
} from "../preview/MarkdownPreview";
import { markdownToHtml } from "../preview/markdown";
import { exportHtmlDocument } from "../export/html";
import { exportWordDocument } from "../export/docx";
import {
  flushDesktopSession,
  loadDesktopWorkspace,
  saveDesktopWorkspace,
} from "../platform/desktopSession";
import {
  drainOsOpenPaths,
  listenForOsOpen,
  openMarkdownFiles,
  readTextAtPath,
  runningOnDesktop,
  saveMarkdownFile,
  type OpenResult,
} from "../platform/fs";
import {
  loadExplorerTree,
  pickDesktopWorkspaceFolder,
  type ExplorerNode,
} from "../platform/desktopExplorer";
import { loadWebWorkspace, saveWebWorkspace } from "../platform/webWorkspace";
import {
  applyThemeToDocument,
  getActiveThemeId,
  isDarkTheme,
  resolveTheme,
  setActiveThemeId,
  type MdyarTheme,
} from "../themes/types";
import { ThemeManager } from "../themes/ThemeManager";
import { getStoredLanguage, type AppLanguage } from "../i18n";
import { SAMPLE_MARKDOWN } from "./sample";
import { Toolbar, type ViewMode } from "./Toolbar";
import { AboutDialog } from "./AboutDialog";
import { ActivityBar } from "./ActivityBar";
import { EditorTabBar } from "./EditorTabBar";
import { EditorViewBar } from "./EditorViewBar";
import { SideBar } from "./SideBar";
import {
  loadSidebarPrefs,
  saveSidebarPrefs,
  type ActivityView,
} from "./activityView";
import {
  createDocument,
  findDocumentByPath,
  getActiveDocument,
  type MdyarDocument,
  type WorkspaceSnapshot,
} from "./documents";
import { APP_NAME } from "./meta";
import { formatTabLabel } from "./fileTypeIcon";
import { checkLatestRelease, type UpdateInfo } from "./updateCheck";
import { openExternalUrl } from "../platform/fs";

/** Keeps each filename on its own line so mixed LTR/RTL text does not reorder the prompt. */
function closeUnsavedMessage(prompt: string, names: string[]): string {
  return `${prompt}\n\n${names.join("\n")}`;
}

function defaultWorkspace(): WorkspaceSnapshot {
  const doc = createDocument({
    content: SAMPLE_MARKDOWN,
    fileName: "welcome.md",
    viewMode: "preview",
    dirty: false,
  });
  return { documents: [doc], activeId: doc.id, folderRoot: null };
}

function bootstrapWorkspace(): WorkspaceSnapshot {
  return loadWebWorkspace() ?? defaultWorkspace();
}

function mergeOpens(
  workspace: WorkspaceSnapshot,
  results: OpenResult[],
  folderRoot?: string | null,
): WorkspaceSnapshot {
  if (results.length === 0) return workspace;
  let documents = [...workspace.documents];
  let activeId = workspace.activeId;
  for (const result of results) {
    const existing = findDocumentByPath(documents, result.path);
    if (existing) {
      activeId = existing.id;
      continue;
    }
    const doc = createDocument({
      content: result.content,
      fileName: result.name,
      filePath: result.path,
      dirty: false,
      viewMode: "preview",
    });
    documents.push(doc);
    activeId = doc.id;
  }
  return {
    documents,
    activeId,
    folderRoot: folderRoot === undefined ? workspace.folderRoot : folderRoot,
  };
}

function patchActiveDoc(
  workspace: WorkspaceSnapshot,
  patch: Partial<MdyarDocument>,
): WorkspaceSnapshot {
  if (!workspace.activeId) return workspace;
  return {
    ...workspace,
    documents: workspace.documents.map((d) =>
      d.id === workspace.activeId ? { ...d, ...patch } : d,
    ),
  };
}

export function App() {
  const { t, i18n } = useTranslation();
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(bootstrapWorkspace);
  const [theme, setTheme] = useState<MdyarTheme>(() => resolveTheme(getActiveThemeId()));
  const [themesOpen, setThemesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [sidebarPrefs, setSidebarPrefs] = useState(loadSidebarPrefs);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
  );
  const [explorerNodes, setExplorerNodes] = useState<ExplorerNode[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);

  const activeDoc = getActiveDocument(workspace);
  const hasOpenDocument = workspace.documents.length > 0;
  const content = activeDoc?.content ?? "";
  const fileName = activeDoc?.fileName ?? APP_NAME;
  const dirty = activeDoc?.dirty ?? false;
  const viewMode = activeDoc?.viewMode ?? "preview";
  const syncScroll = viewMode === "split";

  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const saveRef = useRef<(saveAs?: boolean) => Promise<boolean>>(async () => false);
  const loadOsPathsRef = useRef<(paths: string[]) => Promise<void>>(async () => {});

  const editorRef = useRef<EditorScrollHandle>(null);
  const previewRef = useRef<PreviewScrollHandle>(null);
  const driverRef = useRef<"editor" | "preview" | null>(null);
  const lastLineRef = useRef(0);
  const clearDriverTimer = useRef(0);
  const ignoreEditorSyncUntil = useRef(0);

  const language = (i18n.language?.slice(0, 2) as AppLanguage) || getStoredLanguage();

  const persistWorkspace = useCallback(
    (snapshot: WorkspaceSnapshot) => {
      if (isDesktop) {
        void saveDesktopWorkspace(snapshot);
      } else {
        saveWebWorkspace(snapshot);
      }
    },
    [isDesktop],
  );

  useEffect(() => {
    if (!isDesktop) return;
    const title = `${formatTabLabel(fileName, dirty)} — ${APP_NAME}`;
    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
      getCurrentWindow().setTitle(title),
    );
  }, [fileName, dirty, isDesktop]);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    void runningOnDesktop().then(setIsDesktop);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    void loadDesktopWorkspace().then((stored) => {
      if (!cancelled && stored) setWorkspace(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistWorkspace(workspaceRef.current);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [workspace, persistWorkspace]);

  useEffect(() => {
    const flush = () => persistWorkspace(workspaceRef.current);
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [persistWorkspace]);

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

  useEffect(() => {
    let cancelled = false;
    void checkLatestRelease().then((info) => {
      if (!cancelled) setUpdate(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  loadOsPathsRef.current = async (paths: string[]) => {
    if (paths.length === 0) return;
    const results: OpenResult[] = [];
    for (const path of paths) {
      const result = await readTextAtPath(path);
      if (!result) {
        window.alert(t("dialogs.openFailed", { name: path }));
        continue;
      }
      results.push(result);
    }
    if (results.length === 0) return;
    setWorkspace((ws) => mergeOpens(ws, results));
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const stop = await listenForOsOpen(() => {
        void drainOsOpenPaths().then((paths) => loadOsPathsRef.current(paths));
      });
      if (cancelled) {
        stop();
        return;
      }
      unlisten = stop;
      const paths = await drainOsOpenPaths();
      if (!cancelled) await loadOsPathsRef.current(paths);
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [t]);

  const onEditorScrollLine = useCallback(
    (line: number) => {
      if (!syncScroll) return;
      if (performance.now() < ignoreEditorSyncUntil.current) return;
      if (driverRef.current === "preview") return;
      if (line === lastLineRef.current) return;
      lastLineRef.current = line;
      driverRef.current = "editor";
      previewRef.current?.scrollToLine(line);
      window.clearTimeout(clearDriverTimer.current);
      clearDriverTimer.current = window.setTimeout(() => {
        if (driverRef.current === "editor") driverRef.current = null;
      }, 180);
    },
    [syncScroll],
  );

  const onPreviewScrollLine = useCallback(
    (line: number, force = false) => {
      if (!syncScroll) return;
      if (!force && driverRef.current === "editor") return;
      if (!force && line === lastLineRef.current) return;
      lastLineRef.current = line;
      driverRef.current = "preview";
      editorRef.current?.scrollToLine(line);
      window.clearTimeout(clearDriverTimer.current);
      clearDriverTimer.current = window.setTimeout(() => {
        if (driverRef.current === "preview") driverRef.current = null;
      }, 180);
    },
    [syncScroll],
  );

  const onChange = useCallback((value: string) => {
    setWorkspace((ws) => patchActiveDoc(ws, { content: value, dirty: true }));
  }, []);

  const onPreviewChange = useCallback(
    (value: string) => {
      ignoreEditorSyncUntil.current = performance.now() + 400;
      onChange(value);
    },
    [onChange],
  );

  const setViewMode = useCallback((mode: ViewMode) => {
    setWorkspace((ws) => patchActiveDoc(ws, { viewMode: mode }));
  }, []);

  const handleSelectTab = useCallback((id: string) => {
    setWorkspace((ws) => ({ ...ws, activeId: id }));
  }, []);

  const handleNew = useCallback(() => {
    const doc = createDocument({
      content: "",
      fileName: "untitled.md",
      viewMode: "edit",
      dirty: false,
    });
    setWorkspace((ws) => ({
      ...ws,
      documents: [...ws.documents, doc],
      activeId: doc.id,
    }));
  }, []);

  const handleOpen = useCallback(async () => {
    const results = await openMarkdownFiles();
    if (results.length === 0) return;
    setWorkspace((ws) => mergeOpens(ws, results));
  }, []);

  const handleOpenFolder = useCallback(async () => {
    if (!isDesktop) {
      window.alert(t("dialogs.folderPickerUnsupported"));
      return;
    }
    const root = await pickDesktopWorkspaceFolder();
    if (!root) return;
    setWorkspace((ws) => ({ ...ws, folderRoot: root }));
  }, [isDesktop, t]);

  const refreshExplorerTree = useCallback(async (root: string | null) => {
    if (!root || !isDesktop) {
      setExplorerNodes([]);
      setExplorerLoading(false);
      return;
    }
    setExplorerLoading(true);
    try {
      const nodes = await loadExplorerTree(root);
      setExplorerNodes(nodes);
    } catch {
      setExplorerNodes([]);
    } finally {
      setExplorerLoading(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    void refreshExplorerTree(workspace.folderRoot);
  }, [workspace.folderRoot, refreshExplorerTree]);

  const handleCloseFolder = useCallback(() => {
    setWorkspace((ws) => ({ ...ws, folderRoot: null }));
  }, []);

  const handleOpenExplorerFile = useCallback(async (path: string) => {
    const ws = workspaceRef.current;
    const existing = findDocumentByPath(ws.documents, path);
    if (existing) {
      setWorkspace((prev) => ({ ...prev, activeId: existing.id }));
      return;
    }
    const result = await readTextAtPath(path);
    if (!result) {
      window.alert(t("dialogs.openFailed", { name: path }));
      return;
    }
    setWorkspace((prev) => mergeOpens(prev, [result]));
  }, [t]);

  const handleSave = useCallback(
    async (saveAs = false): Promise<boolean> => {
      const doc = getActiveDocument(workspaceRef.current);
      if (!doc) return false;
      try {
        const result = await saveMarkdownFile(
          doc.content,
          doc.filePath,
          doc.fileName,
          saveAs,
        );
        if (!result) return false;
        setWorkspace((ws) =>
          patchActiveDoc(ws, {
            filePath: result.path,
            fileName: result.name,
            dirty: false,
          }),
        );
        return true;
      } catch {
        window.alert(t("dialogs.saveFailed"));
        return false;
      }
    },
    [t],
  );

  saveRef.current = handleSave;

  const saveDocumentById = useCallback(
    async (docId: string, saveAs = false): Promise<boolean> => {
      const ws = workspaceRef.current;
      const doc = ws.documents.find((d) => d.id === docId);
      if (!doc) return false;
      const forceSaveAs = saveAs || (isDesktop && !doc.filePath);
      try {
        const result = await saveMarkdownFile(
          doc.content,
          doc.filePath,
          doc.fileName,
          forceSaveAs,
        );
        if (!result) return false;
        setWorkspace((current) => ({
          ...current,
          documents: current.documents.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  filePath: result.path,
                  fileName: result.name,
                  dirty: false,
                }
              : d,
          ),
        }));
        return true;
      } catch {
        window.alert(t("dialogs.saveFailed"));
        return false;
      }
    },
    [isDesktop, t],
  );

  const confirmCloseTab = useCallback(
    async (doc: MdyarDocument): Promise<"cancel" | "discard" | "save"> => {
      if (!doc.dirty) return "discard";

      if (isDesktop) {
        const { message } = await import("@tauri-apps/plugin-dialog");
        const yes = i18n.t("dialogs.yes");
        const no = i18n.t("dialogs.no");
        const cancel = i18n.t("dialogs.cancel");
        const choice = await message(
          closeUnsavedMessage(i18n.t("dialogs.tabCloseUnsavedBody"), [doc.fileName]),
          {
            title: i18n.t("dialogs.tabCloseUnsavedTitle"),
            kind: "warning",
            buttons: { yes, no, cancel },
          },
        );
        if (choice === yes || choice === "Yes") return "save";
        if (choice === no || choice === "No") return "discard";
        return "cancel";
      }

      if (window.confirm(t("dialogs.tabCloseSavePrompt"))) {
        return "save";
      }
      if (window.confirm(t("dialogs.unsavedBody"))) {
        return "discard";
      }
      return "cancel";
    },
    [isDesktop, i18n, t],
  );

  const removeTabFromWorkspace = useCallback(
    (ws: WorkspaceSnapshot, id: string): WorkspaceSnapshot => {
      if (ws.documents.length === 1) {
        return { documents: [], activeId: null, folderRoot: ws.folderRoot };
      }
      const index = ws.documents.findIndex((d) => d.id === id);
      const remaining = ws.documents.filter((d) => d.id !== id);
      const nextActive =
        ws.activeId === id
          ? remaining[Math.min(index, remaining.length - 1)]?.id ?? remaining[0]?.id ?? null
          : ws.activeId;
      return { ...ws, documents: remaining, activeId: nextActive };
    },
    [],
  );

  const handleCloseTab = useCallback(
    async (id: string) => {
      const ws = workspaceRef.current;
      const doc = ws.documents.find((d) => d.id === id);
      if (!doc) return;

      const decision = await confirmCloseTab(doc);
      if (decision === "cancel") return;
      if (decision === "save") {
        const saved = await saveDocumentById(id, false);
        if (!saved) return;
      }

      const next = removeTabFromWorkspace(workspaceRef.current, id);
      setWorkspace(next);
      persistWorkspace(next);
    },
    [confirmCloseTab, persistWorkspace, removeTabFromWorkspace, saveDocumentById],
  );

  const handleExport = async () => {
    const doc = getActiveDocument(workspaceRef.current);
    if (!doc) return;
    try {
      const htmlBody = await markdownToHtml(doc.content);
      const saved = await exportHtmlDocument({
        title: doc.fileName,
        htmlBody,
        theme,
        filename: doc.fileName,
      });
      if (!saved) return;
    } catch {
      window.alert(t("dialogs.exportFailed"));
    }
  };

  const handleExportWord = async () => {
    const doc = getActiveDocument(workspaceRef.current);
    if (!doc) return;
    try {
      const saved = await exportWordDocument({
        markdown: doc.content,
        filename: doc.fileName,
        language,
      });
      if (!saved) return;
    } catch {
      window.alert(t("dialogs.exportWordFailed"));
    }
  };

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
        if (!isDesktop) return;
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
  }, [aboutOpen, themesOpen, isDesktop, handleNew, handleOpen, handleOpenFolder, handleCloseTab, toggleSidebar]);

  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    let closing = false;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const stop = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        if (closing || disposed) return;
        closing = true;
        try {
          await flushDesktopSession(workspaceRef.current);
          if (disposed) return;
          await win.destroy();
        } catch {
          window.alert(t("dialogs.autosaveFailed"));
        } finally {
          closing = false;
        }
      });
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [isDesktop, t]);

  const applyTheme = (next: MdyarTheme) => {
    setTheme(next);
    setActiveThemeId(next.id);
    applyThemeToDocument(next);
  };

  const dirtyCount = workspace.documents.filter((d) => d.dirty).length;

  return (
    <div className={isDesktop ? "mdyar-app is-desktop" : "mdyar-app"}>
      <Toolbar
        isDesktop={isDesktop}
        fileName={fileName}
        dirty={dirty}
        hasOpenDocument={hasOpenDocument}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onNew={handleNew}
        onOpen={() => void handleOpen()}
        onOpenFolder={() => void handleOpenFolder()}
        onSave={() => void handleSave(false)}
        onSaveAs={isDesktop ? () => void handleSave(true) : undefined}
        onExportHtml={() => void handleExport()}
        onExportWord={() => void handleExportWord()}
        onThemes={() => setThemesOpen(true)}
        onAbout={() => setAboutOpen(true)}
        updateVersion={update?.outdated ? update.latest : undefined}
      />

      <div className="mdyar-workbench">
        <ActivityBar
          activeView={sidebarPrefs.open ? sidebarPrefs.view : null}
          sidebarOpen={sidebarPrefs.open}
          onSelectView={selectActivityView}
          onToggleSidebar={toggleSidebar}
        />
        <SideBar
          visible={sidebarPrefs.open}
          view={sidebarPrefs.view}
          isDesktop={isDesktop}
          documents={workspace.documents}
          folderRoot={workspace.folderRoot}
          explorerNodes={explorerNodes}
          explorerLoading={explorerLoading}
          activeFilePath={activeDoc?.filePath ?? null}
          language={language}
          updateVersion={update?.outdated ? update.latest : undefined}
          onNew={handleNew}
          onOpen={() => void handleOpen()}
          onOpenFolder={() => void handleOpenFolder()}
          onCloseFolder={handleCloseFolder}
          onOpenExplorerFile={(path) => void handleOpenExplorerFile(path)}
          onRefreshExplorer={() => void refreshExplorerTree(workspace.folderRoot)}
          onThemes={() => setThemesOpen(true)}
          onAbout={() => setAboutOpen(true)}
        />

        <div className="mdyar-center">
          <div className="mdyar-editor-pane">
            <EditorTabBar
              documents={workspace.documents}
              activeId={workspace.activeId}
              onSelectTab={handleSelectTab}
              onCloseTab={(id) => void handleCloseTab(id)}
            />

            <div className="mdyar-editor-body">
              {hasOpenDocument ? (
                <>
                  <EditorViewBar viewMode={viewMode} onViewMode={setViewMode} />

                  <main
                    className={
                      viewMode === "split" ? "mdyar-main is-split" : "mdyar-main is-single"
                    }
                  >
                    {(viewMode === "edit" || viewMode === "split") && (
                      <div className="mdyar-doc-window">
                        <MarkdownEditor
                          key={`${workspace.activeId}-edit`}
                          ref={editorRef}
                          value={content}
                          onChange={onChange}
                          dark={isDarkTheme(theme)}
                          onScrollLine={syncScroll ? onEditorScrollLine : undefined}
                        />
                      </div>
                    )}
                    {(viewMode === "preview" || viewMode === "split") && (
                      <div className="mdyar-doc-window">
                        <MarkdownPreview
                          key={`${workspace.activeId}-preview`}
                          ref={previewRef}
                          source={content}
                          onChange={onPreviewChange}
                          onScrollLine={syncScroll ? onPreviewScrollLine : undefined}
                        />
                      </div>
                    )}
                  </main>
                </>
              ) : (
                <div className="mdyar-empty-editor">
                  <p className="mdyar-empty-editor-title">{t("workspace.allClosed")}</p>
                  <p className="mdyar-empty-editor-hint">{t("workspace.allClosedHint")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mdyar-status">
        <span className={dirty ? "is-dirty" : undefined}>
          {dirty ? t("status.unsaved") : t("status.saved")}
        </span>
        <span>{t("status.chars", { count: content.length })}</span>
        <span>{t("status.tabs", { count: workspace.documents.length })}</span>
        {isDesktop && workspace.folderRoot ? (
          <span className="mdyar-status-folder" title={workspace.folderRoot}>
            {t("status.folder", { name: workspace.folderRoot })}
          </span>
        ) : null}
        {!isDesktop && <span>{t("status.webHint")}</span>}
        {dirtyCount > 1 ? (
          <span>{t("status.dirtyTabs", { count: dirtyCount })}</span>
        ) : null}
        {update?.outdated && (
          <button
            type="button"
            className="mdyar-update-link"
            onClick={() => {
              void openExternalUrl(update.url).catch(() => {
                window.alert(update.url);
              });
            }}
          >
            {t("status.updateAvailable", { version: update.latest })}
          </button>
        )}
      </footer>

      {themesOpen && (
        <ThemeManager
          activeId={theme.id}
          onApply={applyTheme}
          onClose={() => setThemesOpen(false)}
        />
      )}
      {aboutOpen && (
        <AboutDialog onClose={() => setAboutOpen(false)} update={update} />
      )}
    </div>
  );
}
