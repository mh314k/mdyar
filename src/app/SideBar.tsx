import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { explorerDirsToReveal, mergeExpandedDirs } from "./explorerPaths";
import { SettingsPanel } from "./SettingsPanel";

type Props = {
  visible: boolean;
  view: ActivityView;
  folderExplorerAvailable?: boolean;
  documents: MdyarDocument[];
  activeId: string | null;
  folderRoot: string | null;
  explorerNodes?: ExplorerNode[];
  explorerLoading?: boolean;
  activeFilePath?: string | null;
  language: AppLanguage;
  updateVersion?: string;
  onNew: () => void;
  onOpen: () => void;
  onOpenFolder: () => void;
  onCloseFolder?: () => void;
  onOpenExplorerFile?: (path: string) => void;
  onRefreshExplorer?: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onThemes: () => void;
  onAbout: () => void;
};

export function SideBar({
  visible,
  view,
  folderExplorerAvailable = false,
  documents,
  activeId,
  folderRoot,
  explorerNodes = [],
  explorerLoading = false,
  activeFilePath = null,
  language,
  updateVersion,
  onNew,
  onOpen,
  onOpenFolder,
  onCloseFolder,
  onOpenExplorerFile,
  onRefreshExplorer,
  onSelectTab,
  onCloseTab,
  onThemes,
  onAbout,
}: Props) {
  const { t } = useTranslation();
  const [folderExpandedDirs, setFolderExpandedDirs] = useState(() => new Set<string>());

  useEffect(() => {
    setFolderExpandedDirs(new Set());
  }, [folderRoot]);

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

  useEffect(() => {
    if (!folderRoot || explorerNodes.length === 0 || openFilePaths.size === 0) return;
    const reveal = explorerDirsToReveal(explorerNodes, openFilePaths);
    if (reveal.length === 0) return;
    setFolderExpandedDirs((prev) => mergeExpandedDirs(prev, reveal));
  }, [folderRoot, explorerNodes, openFilePaths]);

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
            {folderExplorerAvailable && folderRoot && onRefreshExplorer ? (
              <ActionIcon
                icon={<MdIcon name="refresh" />}
                label={t("sidebar.refreshExplorer")}
                onClick={onRefreshExplorer}
              />
            ) : null}
            {folderExplorerAvailable && folderRoot ? (
              <ActionIcon
                icon={<MdIcon name="unfold_less" />}
                label={t("sidebar.collapseFolders")}
                onClick={() => setFolderExpandedDirs(new Set())}
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
                expandedDirs={folderExpandedDirs}
                onExpandedDirsChange={setFolderExpandedDirs}
                onOpenFile={onOpenExplorerFile}
                onCloseFolder={onCloseFolder}
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
