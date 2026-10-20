import { useTranslation } from "react-i18next";
import {
  IconAbout,
  IconEdit,
  IconExportHtml,
  IconExportWord,
  IconNew,
  IconOpen,
  IconPreview,
  IconSave,
  IconSaveAs,
  IconSplit,
  IconThemes,
} from "./icons";
import { MenuBar } from "./MenuBar";
import { APP_VERSION } from "./meta";
import type { AppLanguage } from "../i18n";
import type { ViewMode } from "./viewMode";

export type { ViewMode };

type Props = {
  fileName: string;
  dirty: boolean;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs?: () => void;
  onExportHtml: () => void;
  onExportWord: () => void;
  onThemes: () => void;
  onAbout: () => void;
  language: AppLanguage;
  updateVersion?: string;
};

export function Toolbar({
  fileName,
  dirty,
  viewMode,
  onViewMode,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportHtml,
  onExportWord,
  onThemes,
  onAbout,
  language,
  updateVersion,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="mdyar-chrome">
      <MenuBar
        viewMode={viewMode}
        onViewMode={onViewMode}
        onNew={onNew}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExportHtml={onExportHtml}
        onExportWord={onExportWord}
        onThemes={onThemes}
        onAbout={onAbout}
        language={language}
        updateVersion={updateVersion}
      />

      <header className="mdyar-toolbar">
        <div className="mdyar-brand">
          <img
            className="mdyar-brand-mark"
            src={`${import.meta.env.BASE_URL}mdyar.svg`}
            alt=""
            width={30}
            height={30}
          />
          <div>
            <strong className="mdyar-brand-name">
              {t("app.name")}
              <span className="mdyar-brand-version">v{APP_VERSION}</span>
            </strong>
            <span className="mdyar-file-name">
              {fileName}
              {dirty ? (
                <span className="mdyar-dirty-dot" aria-hidden="true" />
              ) : null}
            </span>
          </div>
        </div>

        <div className="mdyar-toolbar-actions">
          <div className="mdyar-toolbar-group" role="group" aria-label={t("menu.file")}>
            <button
              type="button"
              className="mdyar-icon-btn"
              onClick={onNew}
              title={t("toolbar.newFile")}
              aria-label={t("toolbar.newFile")}
            >
              <IconNew />
            </button>
            <button
              type="button"
              className="mdyar-icon-btn"
              onClick={onOpen}
              title={t("toolbar.open")}
              aria-label={t("toolbar.open")}
            >
              <IconOpen />
            </button>
            <button
              type="button"
              className="mdyar-icon-btn"
              onClick={onSave}
              title={t("toolbar.save")}
              aria-label={t("toolbar.save")}
            >
              <IconSave />
            </button>
            {onSaveAs ? (
              <button
                type="button"
                className="mdyar-icon-btn"
                onClick={onSaveAs}
                title={t("toolbar.saveAs")}
                aria-label={t("toolbar.saveAs")}
              >
                <IconSaveAs />
              </button>
            ) : null}
            <button
              type="button"
              className="mdyar-icon-btn"
              onClick={onExportHtml}
              title={t("toolbar.exportHtml")}
              aria-label={t("toolbar.exportHtml")}
            >
              <IconExportHtml />
            </button>
            <button
              type="button"
              className="mdyar-icon-btn"
              onClick={onExportWord}
              title={t("toolbar.exportWord")}
              aria-label={t("toolbar.exportWord")}
            >
              <IconExportWord />
            </button>
          </div>

          <div
            className="mdyar-toolbar-group mdyar-segmented"
            role="group"
            aria-label={t("menu.view")}
          >
            {(
              [
                ["preview", "toolbar.previewOnly", IconPreview],
                ["split", "toolbar.splitView", IconSplit],
                ["edit", "toolbar.editOnly", IconEdit],
              ] as const
            ).map(([mode, key, Icon]) => (
              <button
                key={mode}
                type="button"
                className={viewMode === mode ? "is-active" : undefined}
                onClick={() => onViewMode(mode)}
                title={t(key)}
                aria-label={t(key)}
                aria-pressed={viewMode === mode}
              >
                <Icon />
              </button>
            ))}
          </div>

          <div className="mdyar-toolbar-group" role="group" aria-label={t("menu.tools")}>
            <button
              type="button"
              className="mdyar-icon-btn"
              onClick={onThemes}
              title={t("toolbar.themes")}
              aria-label={t("toolbar.themes")}
            >
              <IconThemes />
            </button>
            <button
              type="button"
              className={updateVersion ? "mdyar-icon-btn has-update" : "mdyar-icon-btn"}
              onClick={onAbout}
              title={
                updateVersion
                  ? t("status.updateAvailable", { version: updateVersion })
                  : t("toolbar.about")
              }
              aria-label={
                updateVersion
                  ? t("status.updateAvailable", { version: updateVersion })
                  : t("toolbar.about")
              }
            >
              <IconAbout />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}
