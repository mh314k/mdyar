# MDyar — Developer guide

Technical setup, build, and repository layout. For product overview see the [README](../README.md) (and localized copies).

**Version:** 0.6.0 · **License:** [GPL-3.0-or-later](../LICENSE)

## Prerequisites

- [Node.js 22](https://nodejs.org/)
- Desktop builds: [Rust](https://rustup.rs/) and a system WebView (WebView2 on Windows, WebKitGTK on Linux)

## Web development

```bash
npm install
npm run dev
```

Open http://127.0.0.1:1420 (fixed port for Tauri dev proxy).

In the browser, **Open** uses the file picker and does not keep a disk path. **Save** downloads `.md`. **Save as** is desktop-only.

### Static build (GitHub Pages, base `/mdyar/`)

```bash
# Windows cmd
set GITHUB_PAGES=true
npm run build

# PowerShell
$env:GITHUB_PAGES = "true"
npm run build

# macOS / Linux
GITHUB_PAGES=true npm run build
```

Output: `dist/`. Pushes to `main` or `master` run the Pages workflow. Repository **Settings → Pages → Source → GitHub Actions**.

## Desktop (Tauri 2)

```bash
npm install
npm run tauri:dev
npm run tauri:build
```

`tauri:build` runs `npm run icons` first. Regenerate icons from the app mark: `npx tauri icon public/mdyar.svg`.

Default window 1200×800 (minimum 720×480). Desktop entry: `app.mdyar.desktop`.

Installer registers `.md`, `.markdown`, `.mdown` (not in `tauri dev`). Single-instance: opening another file focuses the existing window; unsaved changes are prompted before replacing the document.

On window close, the desktop app persists the workspace (open tabs and folder) without a save/discard dialog; dirty buffers are backed up under app data.

### Proxifier Portable (Windows)

Proxifier Portable can inject into WebView2 and crash MDyar (`WS2_32.dll`). If `proxifier.exe` or `helper64.exe` is running, MDyar warns at startup. Quit Portable or use the installed WFP edition. Browser `npm run dev` is unaffected.

## Platform behavior

| Capability | Web | Desktop |
| --- | --- | --- |
| Open file | Browser picker; no persistent path | Native dialog; path on disk |
| Open folder / tree explorer | — | Yes |
| Save | Download `.md` | Write to current path |
| Save as | — | Yes |
| HTML / Word export | Download | Save dialog |
| Open `.md` from OS | — | After install (association) |
| Session restore | `localStorage` | App data + workspace JSON |

## Markdown pipeline

remark-parse → remark-gfm → remark-math → MDyar direction plugin → rehype-katex → sanitize. Raw HTML in source is not executed.

Preview blocks and editor lines get explicit `dir="rtl"` / `dir="ltr"`. The editor gutter stays LTR for stable line numbers. Code fences and Mermaid stay LTR.

Direction overrides (also exported to HTML/Word):

```markdown
<!-- mdyar:dir=rtl -->
This block is forced RTL in MDyar.
<!-- /mdyar:dir -->
```

Short forms: `<!-- mdyar:rtl -->`, pairing `<!-- mdyar:dir:rtl O -->` … `<!-- mdyar:dir:rtl C -->`. Preview context menu can set RTL/LTR on paragraphs.

Snippets: `src/editor/markdownAutocomplete.ts`. Default word completion is off. Typing Persian/Arabic mid-line does not pop the menu; **Ctrl+Space** opens all snippets.

## Export

- **HTML:** standalone page with active theme variables; KaTeX and Mermaid from CDN (offline viewing needs network for math/diagrams).
- **Word:** structure, lists, tables, footnotes, inline styles, paragraph direction; code/math/Mermaid/images as plain text.

## Themes and UI language

Built-in themes include Signal Light/Dark/Slate, Paper, Midnight, Sand, Dusk, Contrast, Ember. Custom themes in `localStorage`. Legacy ids `pine-light`, `pine-dark`, `slate-paper` map to Signal.

UI strings: English, فارسی, العربية (`src/i18n/`). App language from stored preference or browser (`fa`, `ar`, else `en`).

## Repository layout

```
src/app/        Shell, workbench, dialogs, sample doc
src/bidi/       Direction detection and MDyar comment parser
src/editor/     CodeMirror, highlighting, completion
src/preview/    Markdown transform, preview, scroll sync
src/export/     HTML and Word
src/themes/     Theme model and manager
src/i18n/       UI locales (en, fa, ar)
src/platform/   Web vs Tauri I/O and session
src-tauri/      Native shell
```

Stack: React 19, TypeScript, Vite 6, unified/remark/rehype, docx, Tauri 2.

## Releases

Tag `v*` (e.g. `v0.6.0`) runs `.github/workflows/tauri.yml` — Windows, Linux (Ubuntu 22.04), macOS (Apple Silicon and Intel).

## Contributing

Issues and pull requests welcome. Contributions are licensed under **GPL-3.0-or-later**. The application license does not apply to the contents of your `.md` files.
