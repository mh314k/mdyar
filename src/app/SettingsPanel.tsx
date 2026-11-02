import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_META, setAppLanguage, type AppLanguage } from "../i18n";
import { MdIcon } from "./icons";
import { CollapsibleExplorerSection } from "./ExplorerTree";

type Props = {
  language: AppLanguage;
  updateVersion?: string;
  onThemes: () => void;
  onAbout: () => void;
};

export function SettingsPanel({ language, updateVersion, onThemes, onAbout }: Props) {
  const { t } = useTranslation();
  const [prefsOpen, setPrefsOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);

  return (
    <>
      <CollapsibleExplorerSection
        title={t("settings.preferences")}
        open={prefsOpen}
        onToggle={() => setPrefsOpen((v) => !v)}
      >
        <ul className="mdyar-settings-list">
          <li>
            <button type="button" className="mdyar-settings-item" onClick={onThemes}>
              <MdIcon name="palette" className="mdyar-settings-item-icon" />
              <span className="mdyar-settings-item-label">{t("toolbar.themes")}</span>
              <MdIcon name="chevron_right" className="mdyar-settings-item-chevron" />
            </button>
          </li>
          <li>
            <div className="mdyar-settings-item mdyar-settings-item--control">
              <MdIcon name="translate" className="mdyar-settings-item-icon" />
              <span className="mdyar-settings-item-label">{t("toolbar.language")}</span>
              <select
                className="mdyar-settings-select"
                value={language}
                aria-label={t("toolbar.language")}
                onChange={(e) => void setAppLanguage(e.target.value as AppLanguage)}
              >
                {(Object.keys(LANGUAGE_META) as AppLanguage[]).map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_META[code].label}
                  </option>
                ))}
              </select>
            </div>
          </li>
        </ul>
      </CollapsibleExplorerSection>

      <CollapsibleExplorerSection
        title={t("settings.help")}
        open={helpOpen}
        onToggle={() => setHelpOpen((v) => !v)}
      >
        <ul className="mdyar-settings-list">
          <li>
            <button
              type="button"
              className={updateVersion ? "mdyar-settings-item has-update" : "mdyar-settings-item"}
              onClick={onAbout}
            >
              <MdIcon name="info_outline" className="mdyar-settings-item-icon" />
              <span className="mdyar-settings-item-label">{t("toolbar.about")}</span>
              {updateVersion ? (
                <span className="mdyar-settings-badge" title={t("about.updateAvailable", { version: updateVersion })}>
                  {updateVersion}
                </span>
              ) : null}
              <MdIcon name="chevron_right" className="mdyar-settings-item-chevron" />
            </button>
          </li>
        </ul>
      </CollapsibleExplorerSection>
    </>
  );
}
