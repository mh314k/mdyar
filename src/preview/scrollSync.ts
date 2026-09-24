/** Source-line helpers for editor ↔ preview scroll sync. */

export function findPreviewLineAtScroll(container: HTMLElement): number {
  const nodes = container.querySelectorAll<HTMLElement>("[data-source-line]");
  if (nodes.length === 0) return 1;

  const marker = container.scrollTop + Math.min(48, container.clientHeight * 0.15);
  let bestLine = 1;
  let bestTop = -Infinity;

  for (const el of nodes) {
    const line = Number(el.dataset.sourceLine);
    if (!Number.isFinite(line)) continue;
    const top = offsetTopWithin(container, el);
    if (top <= marker && top >= bestTop) {
      bestTop = top;
      bestLine = line;
    }
  }

  return Math.max(1, bestLine);
}

export function scrollPreviewToLine(container: HTMLElement, line: number): boolean {
  const nodes = container.querySelectorAll<HTMLElement>("[data-source-line]");
  if (nodes.length === 0) return false;

  let best: HTMLElement | null = null;
  let bestLine = -Infinity;

  for (const el of nodes) {
    const elLine = Number(el.dataset.sourceLine);
    if (!Number.isFinite(elLine)) continue;
    if (elLine <= line && elLine >= bestLine) {
      best = el;
      bestLine = elLine;
    }
  }

  if (!best) {
    best = nodes[nodes.length - 1];
  }

  const next = Math.max(0, offsetTopWithin(container, best) - 8);
  if (Math.abs(container.scrollTop - next) <= 1) return false;
  container.scrollTop = next;
  return true;
}

function offsetTopWithin(container: HTMLElement, el: HTMLElement): number {
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  return eRect.top - cRect.top + container.scrollTop;
}
