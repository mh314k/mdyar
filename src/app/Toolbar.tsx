import { MenuBar } from "./MenuBar";
import { APP_NAME } from "./meta";
import { formatTabLabel } from "./fileTypeIcon";
import { WindowControls } from "./WindowControls";
import type { ViewMode } from "./viewMode";
import { isWindowDragBlocked, startWindowDrag } from "./windowDrag";

export type { ViewMode };

type Props = {
  fileName: string;
  dirty: boolean;
  hasOpenDocument?: boolean;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onNew: () => void;
  onOpen: () => void;
  onOpenFolder: () => void;
  onSave: () => void;
  onSaveAs?: () => void;
  onExportHtml: () => void;
  onExportWord: () => void;
  onThemes: () => void;
  onAbout: () => void;
  updateVersion?: string;
  isDesktop?: boolean;
  folderExplorerAvailable?: boolean;
};

export function Toolbar({
  fileName,
  dirty,
  hasOpenDocument = true,
  viewMode,
  onViewMode,
  onNew,
  onOpen,
  onOpenFolder,
  onSave,
  onSaveAs,
  onExportHtml,
  onExportWord,
  onThemes,
  onAbout,
  updateVersion,
  isDesktop = false,
  folderExplorerAvailable = false,
}: Props) {
  const title = hasOpenDocument
    ? `${formatTabLabel(fileName, dirty)} — ${APP_NAME}`
    : APP_NAME;

  return (
    <header className="mdyar-chrome">
      <div
        className="mdyar-chrome-bar"
        {...(isDesktop ? { "data-tauri-drag-region": true } : {})}
        onPointerDown={(event) => {
          if (!isDesktop || event.button !== 0) return;
          if (isWindowDragBlocked(event.target)) return;
          void startWindowDrag();
        }}
      >
        <div
          className="mdyar-chrome-mark"
          {...(isDesktop ? { "data-tauri-drag-region": true } : {})}
        >
          <img
            src={`${import.meta.env.BASE_URL}mdyar.svg`}
            alt=""
            width={16}
            height={16}
            draggable={false}
            {...(isDesktop ? { "data-tauri-drag-region": true } : {})}
          />
        </div>

        <MenuBar
          embedded
          viewMode={viewMode}
          onViewMode={onViewMode}
          onNew={onNew}
          onOpen={onOpen}
          onOpenFolder={onOpenFolder}
          onSave={onSave}
          onSaveAs={onSaveAs}
          onExportHtml={onExportHtml}
          onExportWord={onExportWord}
          onThemes={onThemes}
          onAbout={onAbout}
          updateVersion={updateVersion}
          isDesktop={isDesktop}
          folderExplorerAvailable={folderExplorerAvailable}
        />

        <div
          className="mdyar-chrome-title"
          title={title}
          {...(isDesktop ? { "data-tauri-drag-region": true } : {})}
        >
          <span
            className="mdyar-chrome-title-text"
            {...(isDesktop ? { "data-tauri-drag-region": true } : {})}
          >
            {title}
          </span>
        </div>

        <div
          className="mdyar-chrome-trailing"
          data-tauri-drag-region="false"
        >
          {isDesktop ? <WindowControls /> : null}
        </div>
      </div>
    </header>
  );
}
