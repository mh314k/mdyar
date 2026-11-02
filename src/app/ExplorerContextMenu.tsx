import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export type ExplorerMenuAction =
  | "newFile"
  | "newFolder"
  | "cut"
  | "copy"
  | "paste"
  | "rename"
  | "delete";

type Props = {
  x: number;
  y: number;
  canPaste: boolean;
  hasTarget: boolean;
  onAction: (action: ExplorerMenuAction) => void;
  onClose: () => void;
};

export function ExplorerContextMenu({
  x,
  y,
  canPaste,
  hasTarget,
  onAction,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = Math.min(0, window.innerWidth - rect.right - 8);
    const dy = Math.min(0, window.innerHeight - rect.bottom - 8);
    if (dx || dy) {
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, [x, y]);

  const run = (action: ExplorerMenuAction) => {
    onClose();
    onAction(action);
  };

  return (
    <ul
      ref={ref}
      className="mdyar-context-menu"
      role="menu"
      style={{ left: x, top: y }}
    >
      <li role="none">
        <button type="button" role="menuitem" className="mdyar-menu-item" onClick={() => run("newFile")}>
          <span className="mdyar-menu-item-label">{t("explorer.newFile")}</span>
        </button>
      </li>
      <li role="none">
        <button type="button" role="menuitem" className="mdyar-menu-item" onClick={() => run("newFolder")}>
          <span className="mdyar-menu-item-label">{t("explorer.newFolder")}</span>
        </button>
      </li>
      <li className="mdyar-menu-sep" role="separator" />
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="mdyar-menu-item"
          disabled={!hasTarget}
          onClick={() => run("cut")}
        >
          <span className="mdyar-menu-item-label">{t("explorer.cut")}</span>
          <kbd>Ctrl+X</kbd>
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="mdyar-menu-item"
          disabled={!hasTarget}
          onClick={() => run("copy")}
        >
          <span className="mdyar-menu-item-label">{t("explorer.copy")}</span>
          <kbd>Ctrl+C</kbd>
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="mdyar-menu-item"
          disabled={!canPaste}
          onClick={() => run("paste")}
        >
          <span className="mdyar-menu-item-label">{t("explorer.paste")}</span>
          <kbd>Ctrl+V</kbd>
        </button>
      </li>
      <li className="mdyar-menu-sep" role="separator" />
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="mdyar-menu-item"
          disabled={!hasTarget}
          onClick={() => run("rename")}
        >
          <span className="mdyar-menu-item-label">{t("explorer.rename")}</span>
          <kbd>F2</kbd>
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="mdyar-menu-item is-danger"
          disabled={!hasTarget}
          onClick={() => run("delete")}
        >
          <span className="mdyar-menu-item-label">{t("explorer.delete")}</span>
          <kbd>Del</kbd>
        </button>
      </li>
    </ul>
  );
}
