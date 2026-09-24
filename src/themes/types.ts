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
    id: "signal-light",
    name: "Signal Light",
    builtin: true,
    colors: {
      bg: "#e8eeeb",
      fg: "#0b1612",
      accent: "#0f8a5f",
      surface: "#f7faf8",
      border: "#9eb5aa",
      muted: "#456055",
    },
    fonts: {
      editor: '"JetBrains Mono", "Vazirmatn", ui-monospace, monospace',
      preview: '"Vazirmatn", "Sora", system-ui, sans-serif',
    },
    fontSize: 15,
    lineHeight: 1.65,
  },
  {
    id: "signal-dark",
    name: "Signal Dark",
    builtin: true,
    colors: {
      bg: "#07110e",
      fg: "#e8f2ec",
      accent: "#2dd4a0",
      surface: "#0f1c17",
      border: "#2a4036",
      muted: "#8aa899",
    },
    fonts: {
      editor: '"JetBrains Mono", "Vazirmatn", ui-monospace, monospace',
      preview: '"Vazirmatn", "Sora", system-ui, sans-serif',
    },
    fontSize: 15,
    lineHeight: 1.65,
  },
  {
    id: "signal-slate",
    name: "Signal Slate",
    builtin: true,
    colors: {
      bg: "#e4e9ef",
      fg: "#101820",
      accent: "#2a6f97",
      surface: "#f4f6f9",
      border: "#a8b4c4",
      muted: "#4d5d70",
    },
    fonts: {
      editor: '"JetBrains Mono", "Vazirmatn", ui-monospace, monospace',
      preview: '"Sora", "Vazirmatn", system-ui, sans-serif',
    },
    fontSize: 15,
    lineHeight: 1.7,
  },
];

const THEMES_KEY = "mdyar.customThemes";
const ACTIVE_KEY = "mdyar.activeTheme";

const LEGACY_THEME_IDS: Record<string, string> = {
  "pine-light": "signal-light",
  "pine-dark": "signal-dark",
  "slate-paper": "signal-slate",
};

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
  const stored = localStorage.getItem(ACTIVE_KEY) ?? "signal-light";
  return LEGACY_THEME_IDS[stored] ?? stored;
}

export function setActiveThemeId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function resolveTheme(id: string): MdyarTheme {
  const mapped = LEGACY_THEME_IDS[id] ?? id;
  return getAllThemes().find((t) => t.id === mapped) ?? BUILTIN_THEMES[0];
}

export function isDarkTheme(theme: MdyarTheme): boolean {
  const hex = theme.colors.bg.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.45;
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
  root.style.setProperty(
    "--mdyar-danger",
    isDarkTheme(theme) ? "#f07178" : "#c0392b",
  );
  root.dataset.theme = isDarkTheme(theme) ? "dark" : "light";
  root.style.colorScheme = isDarkTheme(theme) ? "dark" : "light";
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
