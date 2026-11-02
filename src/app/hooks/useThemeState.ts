import { useEffect, useState } from "react";
import {
  applyThemeToDocument,
  getActiveThemeId,
  resolveTheme,
  setActiveThemeId,
  type MdyarTheme,
} from "../../themes/types";

export function useThemeState() {
  const [theme, setTheme] = useState<MdyarTheme>(() => resolveTheme(getActiveThemeId()));
  const [themesOpen, setThemesOpen] = useState(false);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const applyTheme = (next: MdyarTheme) => {
    setTheme(next);
    setActiveThemeId(next.id);
    applyThemeToDocument(next);
  };

  return { theme, themesOpen, setThemesOpen, applyTheme };
}
