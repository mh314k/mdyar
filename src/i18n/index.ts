import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fa from "./locales/fa.json";
import ar from "./locales/ar.json";

export type AppLanguage = "en" | "fa" | "ar";

export const LANGUAGE_META: Record<
  AppLanguage,
  { label: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", dir: "ltr" },
  fa: { label: "فارسی", dir: "rtl" },
  ar: { label: "العربية", dir: "rtl" },
};

const STORAGE_KEY = "mdyar.language";

export function getStoredLanguage(): AppLanguage {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "en" || raw === "fa" || raw === "ar") return raw;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("fa")) return "fa";
  if (nav.startsWith("ar")) return "ar";
  return "en";
}

export function applyDocumentDirection(lang: AppLanguage) {
  const { dir } = LANGUAGE_META[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}

export async function setAppLanguage(lang: AppLanguage) {
  localStorage.setItem(STORAGE_KEY, lang);
  applyDocumentDirection(lang);
  await i18n.changeLanguage(lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
    ar: { translation: ar },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyDocumentDirection(getStoredLanguage());

/**
 * TODO (roadmap): allow importing extra language packs from the UI
 * by reading a JSON file and calling i18n.addResourceBundle.
 */
export function importLanguagePackStub(): never {
  throw new Error("Language pack import is planned — see README Roadmap");
}

export default i18n;
