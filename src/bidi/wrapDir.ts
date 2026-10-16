import { parseDirDirective, type TextDirection } from "./direction";

export const MDYAR_DIR_OPEN = (dir: TextDirection) => `<!-- mdyar:dir=${dir} -->`;
export const MDYAR_DIR_CLOSE = "<!-- /mdyar:dir -->";

export type SourceRange = {
  /** 1-based inclusive. */
  startLine: number;
  /** 1-based inclusive. */
  endLine: number;
};

const LIST_OR_QUOTE = /^(?:\s*(?:[-*+]|\d+\.)\s+|\s*>+\s*)/;
const CONTINUATION = /^(?: {2,}|\t+)\S/;
const INLINE_OPEN_RE = /<!--\s*mdyar\s*:\s*(?:dir\s*[:=]\s*)?(rtl|ltr)(?:\s+(?:o|open|start))?\s*-->/i;
const INLINE_CLOSE_RE = /<!--\s*(?:\/\s*mdyar\s*:\s*(?:dir(?:\s*[:=]\s*(?:rtl|ltr))?|rtl|ltr)|mdyar\s*:\s*dir\s*[:=]\s*(?:(?:rtl|ltr)\s+(?:c|close|end)|c|close|end|auto|reset))\s*-->/i;

function isTightFlowLine(line: string): boolean {
  return LIST_OR_QUOTE.test(line) || CONTINUATION.test(line);
}

function lineDirective(line: string) {
  return parseDirDirective(line.trim());
}

function isBlank(line: string) {
  return line.trim() === "";
}

function splitSource(source: string): {
  lines: string[];
  newline: "\n" | "\r\n";
  trailingNl: boolean;
} {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const trailingNl = /(?:\r?\n)$/.test(source);
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (trailingNl && lines[lines.length - 1] === "") lines.pop();
  return { lines, newline, trailingNl };
}

function joinSource(lines: string[], newline: "\n" | "\r\n", trailingNl: boolean): string {
  const body = lines.join(newline);
  if (trailingNl) return body.endsWith(newline) ? body : `${body}${newline}`;
  return body;
}

function clampRange(lines: string[], range: SourceRange): SourceRange | null {
  if (lines.length === 0) return null;
  const start = Math.max(1, Math.min(range.startLine, range.endLine));
  const end = Math.min(lines.length, Math.max(range.startLine, range.endLine));
  if (start > end) return null;
  return { startLine: start, endLine: end };
}

export function unionSourceRange(ranges: SourceRange[]): SourceRange | null {
  if (ranges.length === 0) return null;
  return {
    startLine: Math.min(...ranges.map((r) => r.startLine)),
    endLine: Math.max(...ranges.map((r) => r.endLine)),
  };
}

function prevNonBlank(lines: string[], from: number): string | null {
  for (let i = from; i >= 0; i--) {
    if (!isBlank(lines[i])) return lines[i];
  }
  return null;
}

function nextNonBlank(lines: string[], from: number): string | null {
  for (let i = from; i < lines.length; i++) {
    if (!isBlank(lines[i])) return lines[i];
  }
  return null;
}

/** True when inserting sibling HTML comments would split a list or blockquote. */
function wouldSplitTightFlow(lines: string[], startLine: number, endLine: number): boolean {
  const first = lines[startLine - 1];
  const last = lines[endLine - 1];
  if (!first || !last) return false;
  const prev = prevNonBlank(lines, startLine - 2);
  const next = nextNonBlank(lines, endLine);
  return (
    (isTightFlowLine(first) && prev !== null && isTightFlowLine(prev)) ||
    (isTightFlowLine(last) && next !== null && isTightFlowLine(next))
  );
}

type BlockWrapper = {
  kind: "block";
  openIdx: number;
  closeIdx: number;
  dir: TextDirection;
};

type InlineWrapper = {
  kind: "inline";
  dir: TextDirection;
};

function findBlockWrapper(
  lines: string[],
  startLine: number,
  endLine: number,
): BlockWrapper | null {
  let openIdx = startLine - 2;
  while (openIdx >= 0 && isBlank(lines[openIdx])) openIdx--;
  let closeIdx = endLine;
  while (closeIdx < lines.length && isBlank(lines[closeIdx])) closeIdx++;
  if (openIdx < 0 || closeIdx >= lines.length) return null;
  const open = lineDirective(lines[openIdx]);
  const close = lineDirective(lines[closeIdx]);
  if (open?.kind === "open" && close?.kind === "close") {
    return { kind: "block", openIdx, closeIdx, dir: open.dir };
  }
  return null;
}

function findInlineWrapper(
  lines: string[],
  startLine: number,
  endLine: number,
): InlineWrapper | null {
  const first = lines[startLine - 1];
  const last = lines[endLine - 1];
  if (!first || !last) return null;
  const open = first.match(INLINE_OPEN_RE);
  const close = last.match(INLINE_CLOSE_RE);
  if (!open || !close) return null;
  // The first line must start (after a list/quote marker) with the open tag.
  const prefix = first.slice(0, open.index);
  if (prefix.trim() !== "" && !LIST_OR_QUOTE.test(prefix)) return null;
  return { kind: "inline", dir: open[1].toLowerCase() as TextDirection };
}

function applyInline(
  lines: string[],
  startLine: number,
  endLine: number,
  dir: TextDirection | null,
  existing: InlineWrapper | null,
): void {
  if (existing) {
    if (dir === null || dir === existing.dir) {
      lines[startLine - 1] = lines[startLine - 1].replace(INLINE_OPEN_RE, "");
      if (startLine === endLine) {
        lines[endLine - 1] = lines[endLine - 1].replace(INLINE_CLOSE_RE, "");
      } else {
        lines[endLine - 1] = lines[endLine - 1].replace(INLINE_CLOSE_RE, "");
      }
      return;
    }
    lines[startLine - 1] = lines[startLine - 1].replace(INLINE_OPEN_RE, MDYAR_DIR_OPEN(dir));
    return;
  }
  if (dir === null) return;

  const first = lines[startLine - 1];
  const marker = first.match(LIST_OR_QUOTE);
  const prefix = marker ? marker[0] : "";
  const rest = first.slice(prefix.length);
  if (startLine === endLine) {
    lines[startLine - 1] = `${prefix}${MDYAR_DIR_OPEN(dir)}${rest}${MDYAR_DIR_CLOSE}`;
    return;
  }
  lines[startLine - 1] = `${prefix}${MDYAR_DIR_OPEN(dir)}${rest}`;
  lines[endLine - 1] = `${lines[endLine - 1]}${MDYAR_DIR_CLOSE}`;
}

/**
 * Wrap (or unwrap / retarget) a 1-based source line range with MDyar
 * direction comments. Uses sibling HTML comments for ordinary blocks, and
 * inline comments inside list items / blockquotes so CommonMark does not
 * split the parent structure.
 *
 * Passing `dir: null` unwraps an exact existing wrapper and is a no-op otherwise.
 */
export function applyDirToSourceRange(
  source: string,
  range: SourceRange,
  dir: TextDirection | null,
): string {
  const { lines, newline, trailingNl } = splitSource(source);
  const clamped = clampRange(lines, range);
  if (!clamped) return source;

  const { startLine, endLine } = clamped;
  const block = findBlockWrapper(lines, startLine, endLine);
  if (block) {
    const next = [...lines];
    if (dir === null) {
      next.splice(block.closeIdx, 1);
      next.splice(block.openIdx, 1);
    } else if (dir !== block.dir) {
      next[block.openIdx] = MDYAR_DIR_OPEN(dir);
    }
    return joinSource(next, newline, trailingNl);
  }

  const inline = findInlineWrapper(lines, startLine, endLine);
  if (inline || wouldSplitTightFlow(lines, startLine, endLine)) {
    const next = [...lines];
    applyInline(next, startLine, endLine, dir, inline);
    return joinSource(next, newline, trailingNl);
  }

  if (dir === null) return source;

  const next = [...lines];
  next.splice(endLine, 0, MDYAR_DIR_CLOSE);
  next.splice(startLine - 1, 0, MDYAR_DIR_OPEN(dir));
  return joinSource(next, newline, trailingNl);
}
