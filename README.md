# MDyar

**MDyar** is a free, open-source, BiDi-first Markdown editor for Windows, macOS, Linux, and the web.

License: **GPL-3.0-or-later** (copyleft).

## Features (v0.1)

- Live Markdown preview with **split** editor | preview layout
- Full **bidirectional text** (Persian / Arabic / English mixed)
- **GFM** + **KaTeX** math + **Mermaid** diagrams
- **Theme manager** with colors, editor font, preview font, size, line-height
- UI languages: **English**, **فارسی**, **العربية** (RTL/LTR switches cleanly)
- **HTML export** (theme-aware)
- Desktop shell via **Tauri 2** (open / save `.md`)
- Free online use via **GitHub Pages** (no install)

## Try the web app

After enabling GitHub Pages (Settings → Pages → GitHub Actions):

`https://<your-username>.github.io/mdyar/`

Locally:

```bash
npm install
npm run dev
```

Open http://localhost:1420

Build for Pages locally:

```bash
set GITHUB_PAGES=true
npm run build
```

## Desktop (Tauri)

Requires [Rust](https://rustup.rs/) and platform WebView dependencies.

```bash
npm install
npm run icons
npm run tauri:dev      # development
npm run tauri:build    # production installers
```

Generate proper multi-size icons (recommended on macOS/Windows):

```bash
npx tauri icon public/mdyar.svg
```

## Project layout

```
src/           Shared React app (web + desktop)
src-tauri/     Tauri 2 native shell
src/i18n/      Locales (en / fa / ar)
src/themes/    Theme engine + manager UI
src/export/    HTML export (+ Word stub)
src/platform/  Web vs Tauri file APIs
```

## Roadmap (planned — must ship)

These are intentional follow-ups, stubbed in code and tracked here:

1. **Word (`.docx`) export** — `src/export/html.ts` (`exportWordStub`)
2. **Import language packs from the UI** — `src/i18n/index.ts` (`importLanguagePackStub`)
3. **File association**: double-click `.md` opens MDyar in preview — `src/platform/fs.ts` + `src-tauri` `fileAssociations` / setup TODO
4. Advanced theme import/export & sharing
5. Desktop polish: system menu, recent files, multi-file drag-and-drop

## Contributing

Issues and pull requests are welcome. By contributing, you agree that your contributions are licensed under **GPL-3.0-or-later**.

## License

Copyright (C) 2026 MDyar contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](./LICENSE) for the full text.
