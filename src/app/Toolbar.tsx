import { useTranslation } from "react-i18next";
import {
  LANGUAGE_META,
  setAppLanguage,
  type AppLanguage,
} from "../i18n";

export type ViewMode = "preview" | "split" | "edit";

type Props = {
  fileName: string;
  dirty: boolean;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportHtml: () => void;
  onThemes: () => void;
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
  onExportHtml,
  onThemes,
  language,
}: Props) {
  const { t } = useTranslation();

  return (
    <header className="mdyar-toolbar">
      <div className="mdyar-brand">
        <img src={`${import.meta.env.BASE_URL}mdyar.svg`} alt="" width={28} height={28} />
        <div>
          <strong>{t("app.name")}</strong>
          <span className="mdyar-file-name">
            {fileName}
            {dirty ? " •" : ""}
          </span>
        </div>
      </div>

      <div className="mdyar-toolbar-group" role="group" aria-label="File">
        <button type="button" className="mdyar-btn" onClick={onNew}>
          {t("toolbar.newFile")}
        </button>
        <button type="button" className="mdyar-btn" onClick={onOpen}>
          {t("toolbar.open")}
        </button>
        <button type="button" className="mdyar-btn" onClick={onSave}>
          {t("toolbar.save")}
        </button>
        <button type="button" className="mdyar-btn" onClick={onExportHtml}>
          {t("toolbar.exportHtml")}
        </button>
      </div>

      <div className="mdyar-toolbar-group mdyar-segmented" role="group" aria-label="View">
        {(
          [
            ["preview", "toolbar.previewOnly"],
            ["split", "toolbar.splitView"],
            ["edit", "toolbar.editOnly"],
          ] as const
        ).map(([mode, key]) => (
          <button
            key={mode}
            type="button"
            className={viewMode === mode ? "is-active" : undefined}
            onClick={() => onViewMode(mode)}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="mdyar-toolbar-group">
        <button type="button" className="mdyar-btn" onClick={onThemes}>
          {t("toolbar.themes")}
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
