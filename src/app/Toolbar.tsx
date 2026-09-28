import { useTranslation } from "react-i18next";
import {
  LANGUAGE_META,
  setAppLanguage,
  type AppLanguage,
} from "../i18n";
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
import { APP_VERSION } from "./meta";

export type ViewMode = "preview" | "split" | "edit";

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
}: Props) {
  const { t } = useTranslation();

  return (
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

      <div className="mdyar-toolbar-group" role="group" aria-label="File">
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

      <div className="mdyar-toolbar-group mdyar-segmented" role="group" aria-label="View">
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

      <div className="mdyar-toolbar-group">
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
          className="mdyar-icon-btn"
          onClick={onAbout}
          title={t("toolbar.about")}
          aria-label={t("toolbar.about")}
        >
          <IconAbout />
        </button>
        <label className="mdyar-lang">
          <span className="sr-only">{t("toolbar.language")}</span>
          <select
            value={language}
            onChange={(e) => void setAppLanguage(e.target.value as AppLanguage)}
          >
            {(Object.keys(LANGUAGE_META) as AppLanguage[]).map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_META[code].label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
