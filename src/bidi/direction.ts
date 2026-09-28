/** Resolve base paragraph direction from the first strong bidirectional character. */

export type TextDirection = "ltr" | "rtl";

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
