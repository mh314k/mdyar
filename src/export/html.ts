import type { MdyarTheme } from "../themes/types";
import { themeToCssVariables } from "../themes/types";
import { downloadBlob } from "../platform/fs";

const PREVIEW_CSS = `
body {
  margin: 0;
  padding: 2rem;
  background: var(--mdyar-bg);
  color: var(--mdyar-fg);
  font-family: var(--mdyar-font-preview);
  font-size: var(--mdyar-font-size);
  line-height: var(--mdyar-line-height);
}
article { max-width: 48rem; margin: 0 auto; }
h1, h2, h3 { color: var(--mdyar-fg); }
a { color: var(--mdyar-accent); }
code, pre {
  font-family: var(--mdyar-font-editor);
  background: var(--mdyar-surface);
  border: 1px solid var(--mdyar-border);
  border-radius: 6px;
}
pre { padding: 1rem; overflow: auto; }
code { padding: 0.1em 0.35em; }
pre code { border: none; padding: 0; background: transparent; }
blockquote {
  border-inline-start: 3px solid var(--mdyar-accent);
  margin: 1rem 0;
  padding-inline-start: 1rem;
  color: var(--mdyar-muted);
}
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid var(--mdyar-border); padding: 0.4rem 0.6rem; }
.mdyar-mermaid { direction: ltr; margin: 1.25rem 0; overflow-x: auto; }
.katex-display { overflow-x: auto; }
`;

export async function exportHtmlDocument(options: {
  title: string;
  htmlBody: string;
  theme: MdyarTheme;
  filename?: string;
}) {
  const { title, htmlBody, theme, filename } = options;
  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Vazirmatn:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
${themeToCssVariables(theme)}
${PREVIEW_CSS}
</style>
</head>
<body>
<article class="mdyar-export" dir="auto">
${htmlBody}
</article>
<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
const blocks = document.querySelectorAll("pre > code.language-mermaid");
let i = 0;
for (const code of blocks) {
  const pre = code.parentElement;
  if (!pre) continue;
  const host = document.createElement("div");
  host.className = "mdyar-mermaid";
  host.dir = "ltr";
  try {
    const { svg } = await mermaid.render("export-mmd-" + (i++), code.textContent || "");
    host.innerHTML = svg;
    pre.replaceWith(host);
  } catch (e) {
    host.textContent = String(e);
    pre.replaceWith(host);
  }
}
</script>
</body>
</html>`;

  const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
  const name = (filename ?? title).replace(/\.md$/i, "") + ".html";
  await downloadBlob(name, blob);
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * TODO (roadmap): export to Word (.docx) using a GPL-compatible library.
 */
export function exportWordStub(): never {
  throw new Error("Word export is planned — see README Roadmap");
}
