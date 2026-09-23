import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MdyarTheme } from "./types";
import {
  BUILTIN_THEMES,
  createBlankTheme,
  getAllThemes,
  loadCustomThemes,
  saveCustomThemes,
} from "./types";

type Props = {
  activeId: string;
  onApply: (theme: MdyarTheme) => void;
  onClose: () => void;
};

export function ThemeManager({ activeId, onApply, onClose }: Props) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState<MdyarTheme[]>(() => loadCustomThemes());
  const [draft, setDraft] = useState<MdyarTheme | null>(null);

  const all = useMemo(() => [...BUILTIN_THEMES, ...custom], [custom]);

  const persist = (next: MdyarTheme[]) => {
    setCustom(next);
    saveCustomThemes(next);
  };

  const editing = draft ?? all.find((x) => x.id === activeId) ?? all[0];

  const beginEdit = (base: MdyarTheme): MdyarTheme => {
    if (base.builtin) {
      return {
        ...base,
        id: `custom-${crypto.randomUUID()}`,
        name: `${base.name} copy`,
        builtin: false,
        colors: { ...base.colors },
        fonts: { ...base.fonts },
      };
    }
    return { ...base, colors: { ...base.colors }, fonts: { ...base.fonts } };
  };

  const setName = (name: string) => {
    setDraft((prev) => ({ ...(prev ?? beginEdit(editing)), name }));
  };

  const setColor = (key: keyof MdyarTheme["colors"], value: string) => {
    setDraft((prev) => {
      const base = prev ?? beginEdit(editing);
      return { ...base, colors: { ...base.colors, [key]: value } };
    });
  };

  const setFont = (key: keyof MdyarTheme["fonts"], value: string) => {
    setDraft((prev) => {
      const base = prev ?? beginEdit(editing);
      return { ...base, fonts: { ...base.fonts, [key]: value } };
    });
  };

  const setNumber = (key: "fontSize" | "lineHeight", value: number) => {
    setDraft((prev) => ({ ...(prev ?? beginEdit(editing)), [key]: value }));
  };

  const saveTheme = () => {
    if (!draft) return;
    const without = custom.filter((c) => c.id !== draft.id);
    const next = [...without, { ...draft, builtin: false }];
    persist(next);
    onApply(draft);
    setDraft(null);
  };

  return (
    <div className="mdyar-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="mdyar-modal"
        role="dialog"
        aria-labelledby="theme-manager-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mdyar-modal-header">
          <h2 id="theme-manager-title">{t("themes.title")}</h2>
          <button type="button" className="mdyar-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="mdyar-theme-layout">
          <aside className="mdyar-theme-list">
            {all.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={
                  theme.id === (draft?.id ?? activeId)
                    ? "mdyar-theme-item is-active"
                    : "mdyar-theme-item"
                }
                onClick={() => {
                  setDraft(null);
                  onApply(theme);
                }}
              >
                <span>{theme.name}</span>
                <small>{theme.builtin ? t("themes.builtin") : t("themes.custom")}</small>
              </button>
            ))}
            <button
              type="button"
              className="mdyar-btn"
              onClick={() => {
                const blank = createBlankTheme(t("themes.create"));
                setDraft(blank);
              }}
            >
              {t("themes.create")}
            </button>
          </aside>

          <div className="mdyar-theme-form">
            <label>
              {t("themes.name")}
              <input value={editing.name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="mdyar-color-grid">
              {(
                [
                  ["bg", "themes.bg"],
                  ["fg", "themes.fg"],
                  ["accent", "themes.accent"],
                  ["surface", "themes.surface"],
                  ["border", "themes.border"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {t(label)}
                  <input
                    type="color"
                    value={editing.colors[key]}
                    onChange={(e) => setColor(key, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <label>
              {t("themes.editorFont")}
              <input
                value={editing.fonts.editor}
                onChange={(e) => setFont("editor", e.target.value)}
              />
            </label>
            <label>
              {t("themes.previewFont")}
              <input
                value={editing.fonts.preview}
                onChange={(e) => setFont("preview", e.target.value)}
              />
            </label>

            <label>
              {t("themes.fontSize")}: {editing.fontSize}px
              <input
                type="range"
                min={12}
                max={22}
                value={editing.fontSize}
                onChange={(e) => setNumber("fontSize", Number(e.target.value))}
              />
            </label>
            <label>
              {t("themes.lineHeight")}: {editing.lineHeight.toFixed(2)}
              <input
                type="range"
                min={1.2}
                max={2.2}
                step={0.05}
                value={editing.lineHeight}
                onChange={(e) => setNumber("lineHeight", Number(e.target.value))}
              />
            </label>

            <div className="mdyar-theme-actions">
              <button type="button" className="mdyar-btn primary" onClick={saveTheme} disabled={!draft}>
                {t("themes.save")}
              </button>
              <button
                type="button"
                className="mdyar-btn"
                onClick={() => {
                  const copy = beginEdit({
                    ...editing,
                    builtin: true,
                    name: editing.name,
                  });
                  copy.name = `${editing.name} copy`;
                  persist([...custom, copy]);
                  setDraft(copy);
                  onApply(copy);
                }}
              >
                {t("themes.duplicate")}
              </button>
              <button
                type="button"
                className="mdyar-btn danger"
                disabled={!!editing.builtin}
                title={editing.builtin ? t("themes.cannotDeleteBuiltin") : undefined}
                onClick={() => {
                  if (editing.builtin) return;
                  const next = custom.filter((c) => c.id !== editing.id);
                  persist(next);
                  setDraft(null);
                  onApply(getAllThemes()[0]);
                }}
              >
                {t("themes.delete")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
