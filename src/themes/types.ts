export type MdyarTheme = {
  id: string;
  name: string;
  builtin?: boolean;
  colors: {
    bg: string;
    fg: string;
    accent: string;
    surface: string;
    border: string;
    muted: string;
  };
  fonts: {
    editor: string;
    preview: string;
  };
  fontSize: number;
  lineHeight: number;
};

export const BUILTIN_THEMES: MdyarTheme[] = [
  {
    id: "pine-light",
    name: "Pine Light",
    builtin: true,
    colors: {
      bg: "#f4f7f5",
      fg: "#1a2e26",
      accent: "#2d6a4f",
      surface: "#ffffff",
      border: "#c5d5cc",
      muted: "#5c7368",
    },
    fonts: {
      editor: '"IBM Plex Mono", "Vazirmatn", ui-monospace, monospace',
      preview: '"Vazirmatn", "IBM Plex Sans", system-ui, sans-serif',
    },
    fontSize: 15,
    lineHeight: 1.65,
  },
  {
    id: "pine-dark",
    name: "Pine Dark",
    builtin: true,
    colors: {
      bg: "#0f1a16",
      fg: "#e4efe9",
      accent: "#6bbf8a",
      surface: "#16241e",
      border: "#2a4036",
      muted: "#8aa899",
    },
    fonts: {
      editor: '"IBM Plex Mono", "Vazirmatn", ui-monospace, monospace',
      preview: '"Vazirmatn", "IBM Plex Sans", system-ui, sans-serif',
    },
    fontSize: 15,
    lineHeight: 1.65,
  },
  {
    id: "slate-paper",
    name: "Slate Paper",
    builtin: true,
    colors: {
      bg: "#eceff3",
      fg: "#1c2430",
      accent: "#3d5a80",
      surface: "#f8f9fb",
      border: "#c8d0db",
      muted: "#5d6b7c",
    },
    fonts: {
      editor: '"IBM Plex Mono", "Vazirmatn", ui-monospace, monospace',
      preview: '"IBM Plex Sans", "Vazirmatn", system-ui, sans-serif',
    },
    fontSize: 15,
    lineHeight: 1.7,
  },
];

const THEMES_KEY = "mdyar.customThemes";
const ACTIVE_KEY = "mdyar.activeTheme";

export function loadCustomThemes(): MdyarTheme[] {
  try {
    const raw = localStorage.getItem(THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MdyarTheme[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: MdyarTheme[]) {
  localStorage.setItem(THEMES_KEY, JSON.stringify(themes));
}

export function getAllThemes(): MdyarTheme[] {
  return [...BUILTIN_THEMES, ...loadCustomThemes()];
}

export function getActiveThemeId(): string {
  return localStorage.getItem(ACTIVE_KEY) ?? "pine-light";
}

export function setActiveThemeId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function resolveTheme(id: string): MdyarTheme {
  return getAllThemes().find((t) => t.id === id) ?? BUILTIN_THEMES[0];
}

export function applyThemeToDocument(theme: MdyarTheme) {
  const root = document.documentElement;
  root.style.setProperty("--mdyar-bg", theme.colors.bg);
  root.style.setProperty("--mdyar-fg", theme.colors.fg);
  root.style.setProperty("--mdyar-accent", theme.colors.accent);
  root.style.setProperty("--mdyar-surface", theme.colors.surface);
  root.style.setProperty("--mdyar-border", theme.colors.border);
  root.style.setProperty("--mdyar-muted", theme.colors.muted);
  root.style.setProperty("--mdyar-font-editor", theme.fonts.editor);
  root.style.setProperty("--mdyar-font-preview", theme.fonts.preview);
  root.style.setProperty("--mdyar-font-size", `${theme.fontSize}px`);
  root.style.setProperty("--mdyar-line-height", String(theme.lineHeight));
}

export function createBlankTheme(name = "Custom theme"): MdyarTheme {
  return {
    id: `custom-${crypto.randomUUID()}`,
    name,
    builtin: false,
    colors: { ...BUILTIN_THEMES[0].colors },
    fonts: { ...BUILTIN_THEMES[0].fonts },
    fontSize: 15,
    lineHeight: 1.65,
  };
}

export function themeToCssVariables(theme: MdyarTheme): string {
  return `
:root {
  --mdyar-bg: ${theme.colors.bg};
  --mdyar-fg: ${theme.colors.fg};
  --mdyar-accent: ${theme.colors.accent};
  --mdyar-surface: ${theme.colors.surface};
  --mdyar-border: ${theme.colors.border};
  --mdyar-muted: ${theme.colors.muted};
  --mdyar-font-editor: ${theme.fonts.editor};
  --mdyar-font-preview: ${theme.fonts.preview};
  --mdyar-font-size: ${theme.fontSize}px;
  --mdyar-line-height: ${theme.lineHeight};
}
`.trim();
}
