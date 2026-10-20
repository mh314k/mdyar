import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LANGUAGE_META,
  setAppLanguage,
  type AppLanguage,
} from "../i18n";
import { IconLanguage } from "./icons";
import type { ViewMode } from "./viewMode";

type MenuId = "file" | "view" | "tools" | "help";

type MenuEntry =
  | {
      kind: "item";
      label: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | { kind: "sep" };

type Props = {
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
  updateVersion?: string;
};

export function MenuBar({
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
  updateVersion,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<MenuId | null>(null);
  const barRef = useRef<HTMLElement>(null);

  const fileItems: MenuEntry[] = [
    { kind: "item", label: t("toolbar.newFile"), shortcut: "Ctrl+N", onSelect: onNew },
    { kind: "item", label: t("toolbar.open"), shortcut: "Ctrl+O", onSelect: onOpen },
    { kind: "item", label: t("toolbar.save"), shortcut: "Ctrl+S", onSelect: onSave },
    ...(onSaveAs
      ? ([
          {
            kind: "item",
            label: t("toolbar.saveAs"),
            shortcut: "Ctrl+Shift+S",
            onSelect: onSaveAs,
          },
        ] as MenuEntry[])
      : []),
    { kind: "sep" },
    { kind: "item", label: t("toolbar.exportHtml"), onSelect: onExportHtml },
    { kind: "item", label: t("toolbar.exportWord"), onSelect: onExportWord },
  ];

  const viewItems: MenuEntry[] = [
    {
      kind: "item",
      label: t("toolbar.previewOnly"),
      checked: viewMode === "preview",
      onSelect: () => onViewMode("preview"),
    },
    {
      kind: "item",
      label: t("toolbar.splitView"),
      checked: viewMode === "split",
      onSelect: () => onViewMode("split"),
    },
    {
      kind: "item",
      label: t("toolbar.editOnly"),
      checked: viewMode === "edit",
      onSelect: () => onViewMode("edit"),
    },
  ];

  const toolsItems: MenuEntry[] = [
    { kind: "item", label: t("toolbar.themes"), onSelect: onThemes },
  ];

  const helpItems: MenuEntry[] = [
    { kind: "item", label: t("toolbar.about"), onSelect: onAbout },
    ...(updateVersion
      ? ([
          { kind: "sep" },
          {
            kind: "item",
            label: t("status.updateAvailable", { version: updateVersion }),
            onSelect: onAbout,
          },
        ] as MenuEntry[])
      : []),
  ];

  const menus: { id: MenuId; label: string; items: MenuEntry[] }[] = [
    { id: "file", label: t("menu.file"), items: fileItems },
    { id: "view", label: t("menu.view"), items: viewItems },
    { id: "tools", label: t("menu.tools"), items: toolsItems },
    { id: "help", label: t("menu.help"), items: helpItems },
  ];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".mdyar-menubar")) {
        return;
      }
      setOpen(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <nav
      ref={barRef}
      className="mdyar-menubar"
      role="menubar"
      aria-label={t("menu.bar")}
    >
      <div className="mdyar-menubar-start">
        {menus.map((menu) => (
          <AppMenu
            key={menu.id}
            label={menu.label}
            items={menu.items}
            open={open === menu.id}
            badge={menu.id === "help" && Boolean(updateVersion)}
            anyOpen={open !== null}
            onToggle={() => setOpen((current) => (current === menu.id ? null : menu.id))}
            onHoverOpen={() => {
              if (open) setOpen(menu.id);
            }}
            onClose={() => setOpen(null)}
          />
        ))}
      </div>

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
    </nav>
  );
}

function AppMenu({
  label,
  items,
  open,
  badge,
  anyOpen,
  onToggle,
  onHoverOpen,
  onClose,
}: {
  label: string;
  items: MenuEntry[];
  open: boolean;
  badge?: boolean;
  anyOpen: boolean;
  onToggle: () => void;
  onHoverOpen: () => void;
  onClose: () => void;
}) {
  const menuId = useId();

  return (
    <div className="mdyar-menu">
      <button
        type="button"
        className={badge ? "mdyar-menu-trigger has-update" : "mdyar-menu-trigger"}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        onMouseEnter={anyOpen ? onHoverOpen : undefined}
      >
        {label}
      </button>
      {open ? (
        <ul
          id={menuId}
          className="mdyar-menu-popup"
          role="menu"
          aria-label={label}
        >
          {items.map((item, index) =>
            item.kind === "sep" ? (
              <li key={`sep-${index}`} className="mdyar-menu-sep" role="separator" />
            ) : (
              <li key={`${item.label}-${index}`} role="none">
                <button
                  type="button"
                  className={item.checked ? "mdyar-menu-item is-checked" : "mdyar-menu-item"}
                  role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                  aria-checked={item.checked}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    onClose();
                    item.onSelect();
                  }}
                >
                  <span className="mdyar-menu-item-label">{item.label}</span>
                  {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}
