import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { MarkdownPreview } from "../preview/MarkdownPreview";
import { isDarkTheme } from "../themes/types";
import { ThemeManager } from "../themes/ThemeManager";
import { getStoredLanguage, type AppLanguage } from "../i18n";
import { openExternalUrl } from "../platform/fs";
import { AboutDialog } from "./AboutDialog";
import { ActivityBar } from "./ActivityBar";
import { EditorTabBar } from "./EditorTabBar";
import { EditorViewBar } from "./EditorViewBar";
import { remapWorkspacePaths, removeWorkspacePaths } from "./documents";
import { SideBar } from "./SideBar";
import { Toolbar } from "./Toolbar";
import { useAppShortcuts } from "./hooks/useAppShortcuts";
import { useDesktopLifecycle } from "./hooks/useDesktopLifecycle";
import { useDialogsAndUpdate } from "./hooks/useDialogsAndUpdate";
import { useExplorer } from "./hooks/useExplorer";
import { useExportActions } from "./hooks/useExportActions";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { useScrollSync } from "./hooks/useScrollSync";
import { useSidebarPrefs } from "./hooks/useSidebarPrefs";
import { useThemeState } from "./hooks/useThemeState";
import { useWorkspace } from "./hooks/useWorkspace";

export function App() {
  const { t, i18n } = useTranslation();
  const isDesktop = useIsDesktop();
  const language = (i18n.language?.slice(0, 2) as AppLanguage) || getStoredLanguage();

  const {
    workspace,
    setWorkspace,
    workspaceRef,
    saveRef,
    activeDoc,
    hasOpenDocument,
    content,
    fileName,
    dirty,
    viewMode,
    dirtyCount,
    onChange,
    setViewMode,
    handleSelectTab,
    handleNew,
    handleOpen,
    handleSave,
    handleCloseTab,
  } = useWorkspace({ isDesktop, t, i18n });

  const syncScroll = viewMode === "split";
  const { editorRef, previewRef, onEditorScrollLine, onPreviewScrollLine, onPreviewChange } =
    useScrollSync(syncScroll, onChange);

  const { sidebarPrefs, selectActivityView, toggleSidebar } = useSidebarPrefs();
  const { theme, themesOpen, setThemesOpen, applyTheme } = useThemeState();
  const { aboutOpen, setAboutOpen, update } = useDialogsAndUpdate();

  useDesktopLifecycle({ isDesktop, workspaceRef, setWorkspace, t });

  const openDiskPaths = useMemo(
    () =>
      workspace.documents
        .map((d) => d.filePath)
        .filter((p): p is string => Boolean(p)),
    [workspace.documents],
  );

  const {
    explorerNodes,
    explorerLoading,
    explorerEnabled,
    expandedDirs,
    setExpandedDirs,
    toggleDir,
    ensureExpanded,
    refreshExplorerTree,
    handleOpenFolder,
    handleCloseFolder,
    handleOpenExplorerFile,
  } = useExplorer({
    isDesktop,
    folderRoot: workspace.folderRoot,
    openDiskPaths,
    setWorkspace,
    t,
  });

  const { handleExport, handleExportWord } = useExportActions({
    workspaceRef,
    theme,
    language,
    t,
  });

  useAppShortcuts({
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
  });

  const handleExplorerPathMoved = useCallback(
    (from: string, to: string) => {
      setWorkspace((ws) => remapWorkspacePaths(ws, from, to));
    },
    [setWorkspace],
  );

  const handleExplorerPathRemoved = useCallback(
    (path: string) => {
      setWorkspace((ws) => removeWorkspacePaths(ws, path));
    },
    [setWorkspace],
  );

  return (
    <div className={isDesktop ? "mdyar-app is-desktop" : "mdyar-app"}>
      <Toolbar
        isDesktop={isDesktop}
        folderExplorerAvailable={explorerEnabled}
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
          folderExplorerAvailable={explorerEnabled}
          fileOpsEnabled={isDesktop}
          documents={workspace.documents}
          activeId={workspace.activeId}
          folderRoot={workspace.folderRoot}
          explorerNodes={explorerNodes}
          explorerLoading={explorerLoading}
          expandedDirs={expandedDirs}
          onToggleDir={toggleDir}
          onEnsureExpanded={ensureExpanded}
          onCollapseFolders={() => setExpandedDirs(new Set())}
          activeFilePath={activeDoc?.filePath ?? null}
          language={language}
          updateVersion={update?.outdated ? update.latest : undefined}
          onNew={handleNew}
          onOpen={() => void handleOpen()}
          onOpenFolder={() => void handleOpenFolder()}
          onCloseFolder={handleCloseFolder}
          onOpenExplorerFile={(path) => void handleOpenExplorerFile(path, workspace.documents)}
          onRefreshExplorer={() => void refreshExplorerTree(workspace.folderRoot)}
          onExplorerPathMoved={handleExplorerPathMoved}
          onExplorerPathRemoved={handleExplorerPathRemoved}
          onSelectTab={handleSelectTab}
          onCloseTab={(id) => void handleCloseTab(id)}
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
        {workspace.folderRoot ? (
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
