import type { ReactNode, SVGProps } from "react";
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

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const ICONS = {
  new: (
    <Icon>
      <path d="M4 2.5h5.5L12.5 5.5V13.5H4z" />
      <path d="M9.5 2.5V5.5H12.5" />
      <path d="M6 9h4M8 7v4" />
    </Icon>
  ),
  open: (
    <Icon>
      <path d="M2.5 5.5h4l1.2 1.5H13.5v6H2.5z" />
      <path d="M2.5 5.5V3.5h4l1 1.2" />
    </Icon>
  ),
  save: (
    <Icon>
      <path d="M3 2.5h8.5L13.5 5v8.5H3z" />
      <path d="M5 2.5v3.5h5.5V2.5" />
      <path d="M5 13.5v-4h6v4" />
    </Icon>
  ),
  export: (
    <Icon>
      <path d="M8 2.5v7" />
      <path d="M5.5 6.5 8 4l2.5 2.5" />
      <path d="M3 10.5v2.5h10v-2.5" />
    </Icon>
  ),
  themes: (
    <Icon>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  preview: (
    <Icon>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
      <path d="M5 8h6M5 10.5h4" />
    </Icon>
  ),
  split: (
    <Icon>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
      <path d="M8 3.5v9" />
    </Icon>
  ),
  edit: (
    <Icon>
      <path d="M3 12.5 4.2 8.5 11.5 1.2l2.3 2.3L6.5 10.8z" />
      <path d="M10 2.7l2.3 2.3" />
    </Icon>
  ),
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
        <img
          className="mdyar-brand-mark"
          src={`${import.meta.env.BASE_URL}mdyar.svg`}
          alt=""
          width={30}
          height={30}
        />
        <div>
          <strong className="mdyar-brand-name">{t("app.name")}</strong>
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
          {ICONS.new}
        </button>
        <button
          type="button"
          className="mdyar-icon-btn"
          onClick={onOpen}
          title={t("toolbar.open")}
          aria-label={t("toolbar.open")}
        >
          {ICONS.open}
        </button>
        <button
          type="button"
          className="mdyar-icon-btn"
          onClick={onSave}
          title={t("toolbar.save")}
          aria-label={t("toolbar.save")}
        >
          {ICONS.save}
        </button>
        <button
          type="button"
          className="mdyar-icon-btn"
          onClick={onExportHtml}
          title={t("toolbar.exportHtml")}
          aria-label={t("toolbar.exportHtml")}
        >
          {ICONS.export}
        </button>
      </div>

      <div className="mdyar-toolbar-group mdyar-segmented" role="group" aria-label="View">
        {(
          [
            ["preview", "toolbar.previewOnly", ICONS.preview],
            ["split", "toolbar.splitView", ICONS.split],
            ["edit", "toolbar.editOnly", ICONS.edit],
          ] as const
        ).map(([mode, key, icon]) => (
          <button
            key={mode}
            type="button"
            className={viewMode === mode ? "is-active" : undefined}
            onClick={() => onViewMode(mode)}
            title={t(key)}
            aria-label={t(key)}
            aria-pressed={viewMode === mode}
          >
            {icon}
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
          {ICONS.themes}
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
