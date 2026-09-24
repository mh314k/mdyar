import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Markdown token colors. Concrete hues live in CSS variables so they
 * follow the active MDyar theme without rebuilding the highlighter.
 */
const markdownHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: "var(--mdyar-syn-heading)", fontWeight: "700" },
  { tag: t.heading2, color: "var(--mdyar-syn-heading)", fontWeight: "700" },
  { tag: t.heading3, color: "var(--mdyar-syn-heading)", fontWeight: "650" },
  { tag: t.heading4, color: "var(--mdyar-syn-heading)", fontWeight: "650" },
  { tag: t.heading5, color: "var(--mdyar-syn-heading)", fontWeight: "600" },
  { tag: t.heading6, color: "var(--mdyar-syn-heading)", fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, color: "var(--mdyar-muted)", fontStyle: "italic" },
  { tag: t.strikethrough, color: "var(--mdyar-muted)", textDecoration: "line-through" },
  { tag: t.link, color: "var(--mdyar-syn-link)" },
  { tag: t.url, color: "var(--mdyar-syn-link)", textDecoration: "underline" },
  { tag: t.monospace, color: "var(--mdyar-syn-code)" },
  { tag: t.quote, color: "var(--mdyar-muted)", fontStyle: "italic" },
  { tag: t.list, color: "var(--mdyar-fg)" },
  { tag: t.labelName, color: "var(--mdyar-syn-link)" },
  { tag: t.string, color: "var(--mdyar-syn-code)" },
  { tag: t.contentSeparator, color: "var(--mdyar-muted)" },
  { tag: t.processingInstruction, color: "var(--mdyar-syn-mark)" },
  { tag: t.escape, color: "var(--mdyar-syn-mark)" },
  { tag: t.character, color: "var(--mdyar-syn-code)" },
  { tag: t.comment, color: "var(--mdyar-muted)", fontStyle: "italic" },
]);

export const markdownSyntaxHighlighting = syntaxHighlighting(markdownHighlightStyle);

/** Editor-only token palette that tracks light / dark MDyar surfaces. */
export function markdownSyntaxThemeVars(dark: boolean): Record<string, string> {
  if (dark) {
    return {
      "--mdyar-syn-heading": "#5eead4",
      "--mdyar-syn-link": "#7dd3fc",
      "--mdyar-syn-code": "#f0c674",
      "--mdyar-syn-mark": "#8aa899",
    };
  }
  return {
    "--mdyar-syn-heading": "#0b7a55",
    "--mdyar-syn-link": "#1d6fa5",
    "--mdyar-syn-code": "#9a6700",
    "--mdyar-syn-mark": "#5a7268",
  };
}
