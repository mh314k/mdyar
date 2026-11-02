import { MenuBar } from "./MenuBar";
import { APP_NAME } from "./meta";
import { formatTabLabel } from "./fileTypeIcon";
import { WindowControls } from "./WindowControls";
import type { ViewMode } from "./viewMode";

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
}: Props) {
  const title = hasOpenDocument
    ? `${formatTabLabel(fileName, dirty)} — ${APP_NAME}`
    : APP_NAME;

  return (
    <header className="mdyar-chrome">
      <div className="mdyar-chrome-bar">
        <div
          className="mdyar-chrome-mark"
          data-tauri-drag-region={isDesktop ? true : undefined}
        >
          <img
            src={`${import.meta.env.BASE_URL}mdyar.svg`}
            alt=""
            width={16}
            height={16}
            draggable={false}
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
        />

        <div
          className="mdyar-chrome-title"
          data-tauri-drag-region={isDesktop ? true : undefined}
          title={title}
        >
          <span className="mdyar-chrome-title-text">{title}</span>
        </div>

        <div className="mdyar-chrome-trailing">
          {isDesktop ? <WindowControls /> : null}
        </div>
      </div>
    </header>
  );
}
