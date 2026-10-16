/** Resolve base paragraph direction from the first strong bidirectional character, or from explicit MDyar directives. */

export type TextDirection = "ltr" | "rtl";

export type DirDirective =
  | { kind: "open"; dir: TextDirection }
  | { kind: "close" };

function isRtlCodePoint(code: number): boolean {
  return (
    (code >= 0x0590 && code <= 0x08ff) || // Hebrew, Arabic, Syriac, Thaana, N'Ko, Samaritan, Mandaic
    (code >= 0xfb1d && code <= 0xfdff) || // Hebrew/Arabic presentation forms
    (code >= 0xfe70 && code <= 0xfefc) // Arabic presentation forms-B
  );
}

function isLtrCodePoint(code: number): boolean {
  return (
    (code >= 0x0041 && code <= 0x005a) || // A-Z
    (code >= 0x0061 && code <= 0x007a) || // a-z
    (code >= 0x00c0 && code <= 0x02b8) || // Latin-1 / Latin Extended
    (code >= 0x0400 && code <= 0x0481) || // Cyrillic
    (code >= 0x048a && code <= 0x052f) ||
    (code >= 0x0370 && code <= 0x03ff) // Greek
  );
}

/**
 * First-strong heuristic (UAX #9 P2/P3). Prefer this over `dir="auto"` —
 * Firefox is unreliable with `dir=auto` + nested spans / `unicode-bidi: plaintext`.
 */
export function firstStrongDirection(
  text: string,
  fallback: TextDirection = "ltr",
): TextDirection {
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code == null) continue;
    if (isRtlCodePoint(code)) return "rtl";
    if (isLtrCodePoint(code)) return "ltr";
  }
  return fallback;
}

export function applyExplicitDir(el: Element, fallback: TextDirection = "ltr") {
  if (el.getAttribute("dir") === "ltr" || el.getAttribute("dir") === "rtl") return;
  el.setAttribute("dir", firstStrongDirection(el.textContent ?? "", fallback));
}

/**
 * Parse an MDyar direction comment directive.
 *
 * Canonical syntax:
 *   <!-- mdyar:dir=rtl -->   ...   <!-- /mdyar:dir -->
 *   <!-- mdyar:dir=ltr -->   ...   <!-- /mdyar:dir -->
 *
 * Also accepts shorthand / user variants:
 *   <!-- mdyar:rtl --> / <!-- /mdyar:rtl -->
 *   <!-- mdyar:dir:rtl --> / <!-- mdyar:dir:rtl O --> / <!-- mdyar:dir:rtl C -->
 *   <!-- mdyar:dir=end --> / <!-- mdyar:dir=auto --> / <!-- mdyar:dir:close -->
 */
const CLOSE_RE =
  /^<!--\s*(?:\/\s*mdyar\s*:\s*(?:dir(?:\s*[:=]\s*(?:rtl|ltr))?|rtl|ltr)|mdyar\s*:\s*dir\s*[:=]\s*(?:(?:rtl|ltr)\s+(?:c|close|end)|c|close|end|auto|reset))\s*-->$/i;

const OPEN_RE =
  /^<!--\s*mdyar\s*:\s*(?:dir\s*[:=]\s*)?(rtl|ltr)(?:\s+(?:o|open|start))?\s*-->$/i;

export function parseDirDirective(raw: string): DirDirective | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("<!--") || !trimmed.endsWith("-->")) return null;
  if (CLOSE_RE.test(trimmed)) {
    return { kind: "close" };
  }
  const open = trimmed.match(OPEN_RE);
  if (open) {
    const dir = open[1].toLowerCase() as TextDirection;
    return { kind: "open", dir };
  }
  return null;
}

const INLINE_DIRECTIVE_RE = /<!--[\s\S]*?-->/g;

/**
 * Extract leading/inline direction directives from a raw text or HTML fragment,
 * returning the cleaned text and the last directive state change if any.
 */
export function scanDirDirectivesInText(input: string): {
  cleaned: string;
  directives: DirDirective[];
} {
  const directives: DirDirective[] = [];
  const cleaned = input.replace(INLINE_DIRECTIVE_RE, (comment) => {
    const parsed = parseDirDirective(comment);
    if (parsed) {
      directives.push(parsed);
      return "";
    }
    return comment;
  });
  return { cleaned, directives };
}
