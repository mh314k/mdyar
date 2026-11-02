import {
  LANGUAGE_META,
  setAppLanguage,
  type AppLanguage,
} from "../i18n";
import { IconLanguage } from "./icons";

type Props = {
  language: AppLanguage;
};

export function LanguageSelect({ language }: Props) {
  return (
    <label className="mdyar-lang" title="Language · زبان · اللغة">
      <IconLanguage />
      <span className="sr-only">Language · زبان · اللغة</span>
      <select
        value={language}
        aria-label="Language · زبان · اللغة"
        onChange={(e) => void setAppLanguage(e.target.value as AppLanguage)}
      >
        {(Object.keys(LANGUAGE_META) as AppLanguage[]).map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_META[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}
