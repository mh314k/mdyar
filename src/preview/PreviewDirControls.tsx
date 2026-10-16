import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TextDirection } from "../bidi/direction";
import {
  applyDirToSourceRange,
  unionSourceRange,
  type SourceRange,
} from "../bidi/wrapDir";

const BLOCK_SELECTOR =
  "p, h1, h2, h3, h4, h5, h6, blockquote, li, table, ul, ol";

const SKIP_CLOSEST =
  ".mdyar-dir-fab, .mdyar-dir-menu, .mdyar-mermaid, pre, .katex, .katex-display";

export type PreviewDirControlsProps = {
  container: HTMLElement | null;
  source: string;
  onChange: (next: string) => void;
};

type MenuState = {
  x: number;
  y: number;
  range: SourceRange;
  forced: TextDirection | null;
};

function rangeOf(el: HTMLElement): SourceRange | null {
  const start = Number(el.dataset.sourceLine);
  const end = Number(el.dataset.sourceEndLine ?? el.dataset.sourceLine);
  if (!Number.isFinite(start) || start < 1) return null;
  return {
    startLine: start,
    endLine: Number.isFinite(end) && end >= start ? end : start,
  };
}

function isLeafBlock(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "ul" || tag === "ol") return false;
  return true;
}

function resolveBlock(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(SKIP_CLOSEST)) return null;
  const cell = target.closest("td, th, tr, thead, tbody");
  if (cell && root.contains(cell)) {
    const table = cell.closest<HTMLElement>("table");
    if (table && root.contains(table) && table.dataset.sourceLine) return table;
  }
  let el = target.closest<HTMLElement>(BLOCK_SELECTOR);
  if (!el || !root.contains(el)) return null;
  if ((el.tagName === "UL" || el.tagName === "OL") && !el.dataset.sourceLine) {
    el = el.querySelector<HTMLElement>("li[data-source-line]") ?? el;
  }
  if (!el.dataset.sourceLine) {
    el = el.closest<HTMLElement>("[data-source-line]");
  }
  if (!el || !root.contains(el) || el === root) return null;
  if (el.closest(SKIP_CLOSEST)) return null;
  return el;
}

function blocksIntersectingSelection(root: HTMLElement): HTMLElement[] {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return [];
  const all = [...root.querySelectorAll<HTMLElement>(`${BLOCK_SELECTOR}[data-source-line]`)].filter(
    (el) => isLeafBlock(el) && range.intersectsNode(el),
  );
  return all.filter((el) => !all.some((other) => other !== el && el.contains(other)));
}

function forcedOf(el: HTMLElement): TextDirection | null {
  const value = el.dataset.mdyarForced;
  return value === "rtl" || value === "ltr" ? value : null;
}

function clampMenu(x: number, y: number, width: number, height: number) {
  const pad = 8;
  return {
    x: Math.min(Math.max(pad, x), window.innerWidth - width - pad),
    y: Math.min(Math.max(pad, y), window.innerHeight - height - pad),
  };
}

export function PreviewDirControls({ container, source, onChange }: PreviewDirControlsProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<{ el: HTMLElement; range: SourceRange } | null>(null);
  const [fab, setFab] = useState<{ top: number; left: number; next: TextDirection } | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const hoverTimer = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const apply = (range: SourceRange, dir: TextDirection | null) => {
    const next = applyDirToSourceRange(sourceRef.current, range, dir);
    if (next !== sourceRef.current) onChangeRef.current(next);
    setMenu(null);
    setHover(null);
    setFab(null);
  };

  useEffect(() => {
    if (!container) return;
    const article = container.querySelector<HTMLElement>(".mdyar-preview-article");
    if (!article) return;

    const hideFab = () => {
      window.clearTimeout(hoverTimer.current);
      setHover(null);
      setFab(null);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (menu) return;
      if (event.buttons !== 0) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        hideFab();
        return;
      }
      const el = resolveBlock(event.target, article);
      if (!el) {
        hideFab();
        return;
      }
      const range = rangeOf(el);
      if (!range) {
        hideFab();
        return;
      }
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(() => {
        setHover({ el, range });
      }, 160);
    };

    const onPointerLeave = (event: PointerEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Element && next.closest(".mdyar-dir-fab")) return;
      hideFab();
    };

    const onContextMenu = (event: MouseEvent) => {
      const selected = blocksIntersectingSelection(article);
      const clicked = resolveBlock(event.target, article);
      const blocks = selected.length > 0 ? selected : clicked ? [clicked] : [];
      if (blocks.length === 0) return;
      const ranges = blocks.map(rangeOf).filter((r): r is SourceRange => r !== null);
      const range = unionSourceRange(ranges);
      if (!range) return;
      event.preventDefault();
      window.clearTimeout(hoverTimer.current);
      setHover(null);
      setFab(null);
      const forced =
        blocks.length === 1
          ? forcedOf(blocks[0])
          : blocks.every((b) => forcedOf(b) === forcedOf(blocks[0]))
            ? forcedOf(blocks[0])
            : null;
      setTargets(blocks);
      setMenu({ x: event.clientX, y: event.clientY, range, forced });
    };

    article.addEventListener("pointermove", onPointerMove);
    article.addEventListener("pointerleave", onPointerLeave);
    article.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.clearTimeout(hoverTimer.current);
      article.removeEventListener("pointermove", onPointerMove);
      article.removeEventListener("pointerleave", onPointerLeave);
      article.removeEventListener("contextmenu", onContextMenu);
    };
  }, [container, menu]);

  useLayoutEffect(() => {
    if (!hover || menu) {
      setFab(null);
      return;
    }
    const rect = hover.el.getBoundingClientRect();
    const current: TextDirection = hover.el.getAttribute("dir") === "rtl" ? "rtl" : "ltr";
    const next: TextDirection = current === "rtl" ? "ltr" : "rtl";
    const width = 52;
    const top = Math.max(8, rect.top + 4);
    const left =
      current === "rtl"
        ? Math.min(window.innerWidth - width - 8, rect.left + 4)
        : Math.max(8, rect.right - width - 4);
    setFab({ top, left, next });
  }, [hover, menu]);

  useEffect(() => {
    if (!hover || menu) return;
    const reposition = () => {
      setHover((current) => (current ? { ...current } : current));
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [hover, menu]);

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const box = menuRef.current.getBoundingClientRect();
    const next = clampMenu(menu.x, menu.y, box.width, box.height);
    if (next.x !== menu.x || next.y !== menu.y) {
      setMenu({ ...menu, ...next });
    }
  }, [menu]);

  useEffect(() => {
    if (!menu) {
      setTargets((current) => (current.length === 0 ? current : []));
      return;
    }
    for (const el of targets) el.classList.add("is-dir-target");
    return () => {
      for (const el of targets) el.classList.remove("is-dir-target");
    };
  }, [menu, targets]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(null);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target;
      if (node instanceof Element && node.closest(".mdyar-dir-menu")) return;
      setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [menu]);

  if (!container) return null;

  return createPortal(
    <>
      {fab && hover && !menu && (
        <button
          type="button"
          className="mdyar-dir-fab"
          style={{ top: fab.top, left: fab.left }}
          title={
            fab.next === "rtl" ? t("preview.switchToRtl") : t("preview.switchToLtr")
          }
          aria-label={
            fab.next === "rtl" ? t("preview.switchToRtl") : t("preview.switchToLtr")
          }
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            apply(hover.range, fab.next);
          }}
        >
          {fab.next === "rtl" ? "RTL" : "LTR"}
        </button>
      )}

      {menu && (
        <div
          ref={menuRef}
          className="mdyar-dir-menu"
          role="menu"
          aria-label={t("preview.dirMenu")}
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            type="button"
            role="menuitem"
            className={menu.forced === "rtl" ? "is-active" : undefined}
            onClick={() => apply(menu.range, "rtl")}
          >
            {t("preview.forceRtl")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menu.forced === "ltr" ? "is-active" : undefined}
            onClick={() => apply(menu.range, "ltr")}
          >
            {t("preview.forceLtr")}
          </button>
          {menu.forced && (
            <button type="button" role="menuitem" onClick={() => apply(menu.range, null)}>
              {t("preview.clearDir")}
            </button>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
