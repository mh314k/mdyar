import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "../i18n";
import type { MdyarDocument } from "./documents";
import { normalizeFsPath } from "./documents";
import {
  IconNew,
  IconOpenFolder,
  MdIcon,
} from "./icons";
import type { ActivityView } from "./activityView";
import type { ExplorerNode } from "../platform/desktopExplorer";
import { ExplorerFolderSection } from "./ExplorerTree";
import { OpenEditorsSection } from "./OpenEditorsSection";
import { SettingsPanel } from "./SettingsPanel";
import { useExplorerFileOps } from "./hooks/useExplorerFileOps";

type Props = {
  visible: boolean;
  view: ActivityView;
  folderExplorerAvailable?: boolean;
  fileOpsEnabled?: boolean;
  documents: MdyarDocument[];
  activeId: string | null;
  folderRoot: string | null;
  explorerNodes?: ExplorerNode[];
  explorerLoading?: boolean;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onEnsureExpanded: (dirPaths: Iterable<string>) => void;
  activeFilePath?: string | null;
  language: AppLanguage;
  updateVersion?: string;
  onNew: () => void;
  onOpen: () => void;
  onOpenFolder: () => void;
  onCloseFolder?: () => void;
  onOpenExplorerFile?: (path: string) => void;
  onRefreshExplorer?: () => void;
  onExplorerPathMoved?: (from: string, to: string) => void;
  onExplorerPathRemoved?: (path: string) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onThemes: () => void;
  onAbout: () => void;
  onCollapseFolders?: () => void;
};

export function SideBar({
  visible,
  view,
  folderExplorerAvailable = false,
  fileOpsEnabled = false,
  documents,
  activeId,
  folderRoot,
  explorerNodes = [],
  explorerLoading = false,
  expandedDirs,
  onToggleDir,
  onEnsureExpanded,
  activeFilePath = null,
  language,
  updateVersion,
  onNew,
  onOpen,
  onOpenFolder,
  onCloseFolder,
  onOpenExplorerFile,
  onRefreshExplorer,
  onExplorerPathMoved,
  onExplorerPathRemoved,
  onSelectTab,
  onCloseTab,
  onThemes,
  onAbout,
  onCollapseFolders,
}: Props) {
  const { t } = useTranslation();

  const dirtyFilePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const doc of documents) {
      if (doc.dirty && doc.filePath) paths.add(normalizeFsPath(doc.filePath));
    }
    return paths;
  }, [documents]);

  const openFilePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const doc of documents) {
      if (doc.filePath) paths.add(normalizeFsPath(doc.filePath));
    }
    return paths;
  }, [documents]);

  const refresh = () => onRefreshExplorer?.();

  const fileOps = useExplorerFileOps({
    enabled: Boolean(fileOpsEnabled && folderRoot),
    folderRoot,
    onRefresh: refresh,
    onPathMoved: (from, to) => onExplorerPathMoved?.(from, to),
    onPathRemoved: (path) => onExplorerPathRemoved?.(path),
    onOpenCreatedFile: (path) => onOpenExplorerFile?.(path),
    onEnsureExpanded: (dirPath) => onEnsureExpanded([dirPath]),
  });

  const titles: Record<ActivityView, string> = {
    explorer: t("activity.explorer"),
    settings: t("activity.settings"),
  };

  return (
    <aside
      className={visible ? "mdyar-sidebar" : "mdyar-sidebar is-collapsed"}
      aria-label={titles[view]}
      aria-hidden={!visible}
    >
      <header className="mdyar-sidebar-header">
        <span className="mdyar-sidebar-title">{titles[view]}</span>
        {view === "explorer" ? (
          <div
            className="mdyar-sidebar-header-actions"
            role="toolbar"
            aria-label={t("sidebar.explorerActions")}
          >
            <ActionIcon icon={<IconNew />} label={t("toolbar.newFile")} onClick={onNew} />
            <ActionIcon
              icon={<MdIcon name="file_open" />}
              label={t("toolbar.open")}
              onClick={onOpen}
            />
            {folderExplorerAvailable ? (
              <ActionIcon
                icon={<IconOpenFolder />}
                label={t("toolbar.openFolder")}
                onClick={onOpenFolder}
              />
            ) : null}
            {fileOpsEnabled && folderRoot ? (
              <>
                <ActionIcon
                  icon={<MdIcon name="note_add" />}
                  label={t("explorer.newFile")}
                  onClick={fileOps.createFileInSelection}
                />
                <ActionIcon
                  icon={<MdIcon name="create_new_folder" />}
                  label={t("explorer.newFolder")}
                  onClick={fileOps.createFolderInSelection}
                />
              </>
            ) : null}
            {folderExplorerAvailable && folderRoot && onRefreshExplorer ? (
              <ActionIcon
                icon={<MdIcon name="refresh" />}
                label={t("sidebar.refreshExplorer")}
                onClick={onRefreshExplorer}
              />
            ) : null}
            {folderExplorerAvailable && folderRoot && onCollapseFolders ? (
              <ActionIcon
                icon={<MdIcon name="unfold_less" />}
                label={t("sidebar.collapseFolders")}
                onClick={onCollapseFolders}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mdyar-sidebar-body">
        {view === "explorer" ? (
          <>
            <OpenEditorsSection
              documents={documents}
              activeId={activeId}
              onSelectTab={onSelectTab}
              onCloseTab={onCloseTab}
            />

            {folderRoot && onCloseFolder && onOpenExplorerFile ? (
              <ExplorerFolderSection
                root={folderRoot}
                nodes={explorerNodes}
                loading={explorerLoading}
                activeFilePath={activeFilePath}
                openFilePaths={openFilePaths}
                dirtyFilePaths={dirtyFilePaths}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                onOpenFile={onOpenExplorerFile}
                onCloseFolder={onCloseFolder}
                fileOpsEnabled={fileOpsEnabled}
                selection={fileOps.selection}
                clipboard={fileOps.clipboard}
                inlineDraft={fileOps.inlineDraft}
                onSelect={fileOps.setSelection}
                onMenuAction={fileOps.handleMenuAction}
                onInlineNameChange={fileOps.setInlineName}
                onInlineSubmit={() => void fileOps.submitInline()}
                onInlineCancel={fileOps.cancelInline}
              />
            ) : folderExplorerAvailable ? (
              <p className="mdyar-sidebar-empty mdyar-explorer-hint">{t("explorer.openFolderHint")}</p>
            ) : (
              <p className="mdyar-sidebar-empty mdyar-explorer-hint">{t("explorer.webFolderUnsupported")}</p>
            )}
          </>
        ) : null}

        {view === "settings" ? (
          <SettingsPanel
            language={language}
            updateVersion={updateVersion}
            onThemes={onThemes}
            onAbout={onAbout}
          />
        ) : null}
      </div>
    </aside>
  );
}

function ActionIcon({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="mdyar-sidebar-action" title={label} aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}
