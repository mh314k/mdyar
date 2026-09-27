# MDyar

**MDyar** ویرایشگر آزاد و متن‌باز مارک‌داون است که از اول برای متن دوجهته ساخته شده: فارسی، عربی و انگلیسی می‌توانند در یک پاراگراف، جدول یا فهرست کنار هم بنشینند و جهت هر تکه سر جایش بماند.

نسخهٔ فعلی **۰.۲.۰** است. روی وب (بدون نصب) و به‌صورت برنامهٔ دسکتاپ برای ویندوز، مک و لینوکس کار می‌کند. مجوز: **GPL-3.0-or-later**.

MDyar is a free, open-source, BiDi-first Markdown editor for the web and for Windows, macOS, and Linux. [English](#english).

وب‌اپ، بعد از روشن کردن GitHub Pages:

**https://mh314k.github.io/mdyar/**

## امکانات

- سه نما: **پیش‌نمایش**، **اسپلیت** (ویرایشگر و پیش‌نمایش کنار هم) و **ویرایش**
- پیش‌نمایش زنده؛ در نمای اسپلیت پیمایش دو طرف با شمارهٔ خط منبع هم‌گام می‌شود
- متن دوجهته: جهت هر بلوک در پیش‌نمایش و هر سطر در ویرایشگر از محتوای خودش می‌آید، نه از زبان دکمه‌های رابط
- **GFM** (جدول، چک‌لیست، خط‌خوردن، پاورقی)، فرمول **KaTeX** و نمودار **Mermaid**
- برجسته‌سازی نحو مارک‌داون و تکمیل قطعه‌ها (عنوان، فهرست، جدول، کد، فرمول، پیوند و مانند آن)
- شمارهٔ خط، تا شدن بلوک‌ها، روشن شدن خط فعال و شکستن سطرهای بلند
- مدیر تم: سه تم آماده، به‌علاوهٔ تم سفارشی با رنگ، فونت ویرایشگر، فونت پیش‌نمایش، اندازه و فاصلهٔ خط
- زبان رابط: **English**، **فارسی**، **العربية** — جهت کل پنجره با زبان عوض می‌شود و زبان سند مستقل می‌ماند
- خروجی **HTML** (صفحهٔ کامل با تم فعلی) و **Word (`.docx`)**
- پوستهٔ دسکتاپ با **Tauri 2**: باز کردن و ذخیره روی دیسک، «ذخیره به‌عنوان»، و باز شدن `.md` / `.markdown` / `.mdown` با دوبار کلیک

با اولین اجرا سند نمونهٔ `welcome.md` باز می‌شود. نقطهٔ کنار نام فایل یعنی نسبت به آخرین ذخیره تغییری مانده است.

## اجرای وب

پیش‌نیاز: [Node.js 22](https://nodejs.org/) (همان نسخه‌ای که در CI استفاده می‌شود).

```bash
npm install
npm run dev
```

سپس http://127.0.0.1:1420 را باز کنید. پورت ثابت است تا پوستهٔ دسکتاپ هم به همین آدرس وصل شود.

در مرورگر، «باز کردن» فایل را داخل صفحه می‌خواند و مسیر دیسک را نگه نمی‌دارد. «ذخیره» یعنی دانلود `.md`. «ذخیره به‌عنوان» فقط در دسکتاپ هست.

ساخت نسخهٔ استاتیک برای GitHub Pages (مسیر پایه `/mdyar/`):

```bash
# Windows (cmd)
set GITHUB_PAGES=true
npm run build

# PowerShell
$env:GITHUB_PAGES = "true"
npm run build

# macOS / Linux
GITHUB_PAGES=true npm run build
```

خروجی در `dist/` است. `npm run preview` همان بیلد را محلی سرو می‌کند.

انتشار وب خودکار است: پوش به شاخهٔ `main` یا `master`، ورک‌فلؤ `.github/workflows/pages.yml` را اجرا می‌کند. در مخزن، Settings → Pages → Source را روی **GitHub Actions** بگذارید.

## دسکتاپ

پیش‌نیازها: Node.js 22، [Rust](https://rustup.rs/) (از طریق rustup) و WebView سیستم (WebView2 در ویندوز، WebKitGTK در لینوکس).

```bash
npm install
npm run tauri:dev      # توسعه
npm run tauri:build    # نصب‌کنندهٔ تولیدی
```

`tauri:build` قبل از بسته‌بندی آیکون‌ها را با `npm run icons` می‌سازد. برای مجموعهٔ آیکون چنداندازه‌ای از روی نشان برنامه:

```bash
npx tauri icon public/mdyar.svg
```

پنجرهٔ پیش‌فرض ۱۲۰۰×۸۰۰ است (حداقل ۷۲۰×۴۸۰). شناسهٔ بسته: `app.mdyar.desktop`.

### باز شدن فایل از سیستم‌عامل

نصب‌کننده پسوندهای `.md`، `.markdown` و `.mdown` را ثبت می‌کند. این ثبت هنگام نصب انجام می‌شود، نه در `tauri dev`.

برنامه تک‌نمونه‌ای است: اگر MDyar باز باشد و دوباره روی فایلی دوبار کلیک کنید، همان پنجره جلو می‌آید و فایل در نمای پیش‌نمایش بارگذاری می‌شود. اگر تغییر ذخیره‌نشده داشته باشید، قبل از جایگزینی سند پرسیده می‌شود.

### ویندوز و Proxifier

**Proxifier Portable** داخل WebView2 تزریق می‌شود و پنجرهٔ دسکتاپ را با خطای `WS2_32.dll` می‌بندد. MDyar اگر `proxifier.exe` یا `helper64.exe` را در حال اجرا ببیند، قبل از باز شدن پنجره هشدار می‌دهد. Portable را ببندید، یا از نسخهٔ نصب‌شدهٔ Proxifier (حالت WFP) استفاده کنید. `npm run dev` در مرورگر تحت تأثیر این موضوع نیست.

## وب و دسکتاپ

| | وب | دسکتاپ |
| --- | --- | --- |
| باز کردن | انتخاب فایل در مرورگر؛ مسیر نگه داشته نمی‌شود | گفتگوی سیستم و خواندن از دیسک |
| ذخیره | دانلود `.md` | نوشتن روی همان مسیر؛ اگر مسیری نباشد محل پرسیده می‌شود |
| ذخیره به‌عنوان | ندارد | دارد |
| خروجی HTML / Word | دانلود | گفتگوی ذخیره و نوشتن روی دیسک |
| دوبار کلیک روی `.md` | ندارد | دارد (بعد از نصب) |
| تم و زبان | `localStorage` مرورگر | `localStorage` داخل WebView |

نوار وضعیت در وب یادآوری می‌کند که فایل‌ها داخل مرورگر می‌مانند.

## مارک‌داون و پیش‌نمایش

خط لوله: `remark-parse` + `remark-gfm` + `remark-math`، سپس `rehype-katex` و `rehype-sanitize`. HTML خام داخل سند اجرا نمی‌شود.

- جدول، فهرست کار، خط‌خوردن، پاورقی و پیوند
- فرمول درون‌خط (`$…$`) و نمایشی (`$$…$$`) با KaTeX
- بلوک ` ```mermaid ` در کلاینت رسم می‌شود (`securityLevel: strict`). خطا به‌جای نمودار نشان داده می‌شود
- جهت بلوک‌های پیش‌نمایش `auto` است. نمودار و بلوک کد چپ‌به‌راست می‌مانند تا شکل و کد به‌هم نریزد
- کلیک روی پیوند داخلی (`#…`) همان صفحه را به هدف اسکرول می‌کند

ویرایشگر روی CodeMirror 6 است. بدنهٔ ویرایشگر چپ‌به‌راست می‌ماند تا شمارهٔ خط جابه‌جا نشود؛ هر سطر جداگانه `dir="auto"` می‌گیرد. تکمیل خودکار فقط ساختار مارک‌داون را پیشنهاد می‌کند، نه واژه‌های معمولی جمله.

## خروجی

### HTML

یک فایل HTML مستقل با متغیرهای رنگ و فونت تم فعال ساخته می‌شود. بدنهٔ `dir="auto"` دارد. استایل KaTeX و رسم Mermaid از CDN بارگذاری می‌شوند، پس صفحهٔ صادرشده برای فرمول و نمودار به شبکه نیاز دارد. اگر رسم نمودار شکست بخورد، بلوک کد سر جایش می‌ماند.

### Word (`.docx`)

دکمهٔ خروجی ورد این‌ها را نگه می‌دارد:

- عنوان‌ها، پاراگراف، نقل‌قول، خط افقی
- فهرست ساده، شماره‌دار و تودرتو، و چک‌لیست (☑ / ☐)
- جدول، با جهت دیداری راست‌به‌چپ وقتی متن جدول راست‌به‌چپ است
- ضخیم، کج، خط‌خورده، کد درون‌خط، پیوند `http` / `https` / `mailto`
- پاورقی
- جهت پاراگراف از متن همان پاراگراف؛ زبان bidi سند از زبان رابط (فارسی، عربی یا انگلیسی)

این‌ها به شکل متن می‌مانند، نه شیء تعبیه‌شده: بلوک کد، فرمول، نمودار Mermaid (همان منبع کد) و تصویر (متن جایگزین یا نشانی، نه خود فایل تصویر).

## تم و زبان

تم‌های آماده: **Signal Light**، **Signal Dark**، **Signal Slate**. فونت پیش‌فرض پیش‌نمایش و رابط Vazirmatn و Sora است؛ فونت ویرایشگر JetBrains Mono به‌همراه Vazirmatn.

تم سفارشی در همین دستگاه ذخیره می‌شود. می‌توان تم را ساخت، کپی کرد یا (اگر سفارشی باشد) حذف کرد. تم آماده حذف نمی‌شود؛ ویرایش آن یک کپی سفارشی می‌سازد. شناسه‌های قدیمی `pine-light`، `pine-dark` و `slate-paper` به تم‌های Signal نگاشت می‌شوند.

زبان رابط از انتخاب قبلی در `localStorage` می‌آید و اگر نباشد از زبان مرورگر (`fa`، `ar`، و در غیر این صورت `en`).

## ساختار پروژه

```
src/app/            پوستهٔ برنامه، نوار ابزار، سند نمونه
src/editor/         CodeMirror، برجسته‌سازی، تکمیل قطعه
src/preview/        تبدیل مارک‌داون، پیش‌نمایش، هم‌گام‌سازی پیمایش
src/export/         خروجی HTML و Word
src/themes/         مدل تم و پنجرهٔ مدیر تم
src/i18n/           انگلیسی، فارسی، عربی
src/platform/       فایل در وب در برابر Tauri
src-tauri/          پوستهٔ بومی Tauri 2
public/mdyar.svg    نشان برنامه
scripts/            اجرای Tauri و ساخت آیکون
```

رابط با React 19 و TypeScript نوشته شده و با Vite 6 باندل می‌شود. پشتهٔ پیش‌نمایش unified است. خروجی ورد با کتابخانهٔ `docx` ساخته می‌شود. پوستهٔ دسکتاپ پلاگین‌های dialog، fs و single-instance را دارد.

## انتشار دسکتاپ

تگ `v*` (مثلاً `v0.2.0`) ورک‌فلؤ `.github/workflows/tauri.yml` را اجرا می‌کند و پیش‌نویس Release می‌سازد:

- ویندوز
- لینوکس (Ubuntu 22.04)
- مک، هر دو معماری Apple Silicon و Intel

## نقشهٔ راه

این‌ها هنوز ساخته نشده‌اند:

1. **وارد کردن بستهٔ زبان از رابط** — `importLanguagePackStub` در `src/i18n/index.ts` فقط خطا می‌دهد. زبان‌های همراه برنامه انگلیسی، فارسی و عربی‌اند.
2. **وارد و خارج کردن تم** و به اشتراک گذاشتن آن. تم سفارشی فقط در `localStorage` همین دستگاه است.
3. **صیقل دسکتاپ:** منوی سیستم، فهرست فایل‌های اخیر، و رها کردن چند فایل با هم روی پنجره.

خروجی ورد و باز شدن `.md` با دوبار کلیک در همین نسخه هستند؛ مورد سوم فقط برای نصب‌کنندهٔ دسکتاپ است، نه برای وب.

## مشارکت

مسئله و درخواست ادغام خوش‌آمد است. با مشارکت، می‌پذیرید که سهم شما تحت **GPL-3.0-or-later** منتشر شود.

مجوز برنامه به محتوای فایل‌های `.md` شما سرایت نمی‌کند.

## مجوز

Copyright (C) 2026 MDyar contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

متن کامل در [LICENSE](./LICENSE) است.

---

## English

**MDyar** is a free, open-source Markdown editor built for bidirectional text. Persian, Arabic, and English can share a paragraph, a table, or a list, and each run keeps its own direction.

Version **0.2.0**. It runs in the browser and as a desktop app on Windows, macOS, and Linux. License: **GPL-3.0-or-later**.

Web app (after GitHub Pages is enabled): **https://mh314k.github.io/mdyar/**

### Features

- **Preview**, **split**, and **edit** layouts. Split view keeps editor and preview scroll in step by source line.
- Per-block direction in the preview and per-line direction in the editor, independent of the UI language.
- **GFM**, **KaTeX** math, and **Mermaid** diagrams. Raw HTML in the document is stripped.
- Markdown syntax highlighting and snippet autocomplete (headings, lists, tables, fences, math, links, footnotes). Completions do not suggest ordinary words.
- Line numbers, code folding, active-line highlight, and line wrapping. The editor surface stays left-to-right so the gutter does not flip; each line is `dir="auto"`.
- Theme manager: Signal Light, Signal Dark, Signal Slate, plus custom themes (colors, editor font, preview font, size, line height) stored in `localStorage`.
- UI languages: English, فارسی, العربية. The window direction follows the UI language; document direction does not.
- **HTML** and **Word (`.docx`)** export.
- **Tauri 2** desktop shell: open, save, save as, and double-click open for `.md`, `.markdown`, and `.mdown`.

The first launch opens the bundled `welcome.md` sample. A dot beside the file name means the buffer is dirty. New, open, and an OS-opened file ask before discarding unsaved edits.

### Web

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:1420. The port is fixed so the desktop shell can attach to the same dev server.

In the browser, Open reads a file into the page and does not keep a disk path. Save downloads a `.md` file. Save As exists only on the desktop.

```bash
GITHUB_PAGES=true npm run build
```

On Windows cmd use `set GITHUB_PAGES=true` before `npm run build`. On PowerShell, `$env:GITHUB_PAGES = "true"`. Output goes to `dist/`. Pushes to `main` or `master` deploy via GitHub Actions (Settings → Pages → GitHub Actions).

### Desktop

Requires Node.js 22, [Rust](https://rustup.rs/), and the system WebView (WebView2 on Windows, WebKitGTK on Linux).

```bash
npm install
npm run tauri:dev
npm run tauri:build
```

`tauri:build` runs `npm run icons` first. For a full icon set from the mark: `npx tauri icon public/mdyar.svg`.

File associations are registered by the installer, not by `tauri dev`. The app is single-instance: a second double-click focuses the existing window and loads that file into preview.

**Windows + Proxifier Portable** injects into WebView2 and crashes the window (`WS2_32.dll`). MDyar warns if `proxifier.exe` or `helper64.exe` is running. Quit Portable, or use the installed Proxifier edition (WFP). `npm run dev` in a browser is unaffected.

| | Web | Desktop |
| --- | --- | --- |
| Open | Browser file picker; no path kept | Native dialog, read from disk |
| Save | Download `.md` | Write the current path, or ask if there is none |
| Save as | No | Yes |
| HTML / Word export | Download | Native save dialog |
| Double-click `.md` | No | Yes, after install |

### Export notes

HTML is a standalone page using the active theme. KaTeX CSS and Mermaid are loaded from a CDN, so formulas and diagrams in the exported file need a network. A failed diagram stays as a code block.

Word keeps headings, paragraphs, quotes, horizontal rules, nested lists, task lists, tables (including visual RTL), bold, italic, strike, inline code, `http` / `https` / `mailto` links, and footnotes. Paragraph direction follows that paragraph’s text. Code blocks, math, Mermaid, and images are written as text (Mermaid as its source; images as alt text or URL, not embedded files).

### Layout

```
src/app/        Shell, toolbar, sample document
src/editor/     CodeMirror, highlighting, snippets
src/preview/    Markdown pipeline, preview, scroll sync
src/export/     HTML and Word
src/themes/     Theme model and manager
src/i18n/       en / fa / ar
src/platform/   Web vs Tauri file APIs
src-tauri/      Tauri 2 native shell
```

The UI is React 19 and TypeScript, bundled with Vite 6. Preview uses unified. Word export uses the `docx` library.

### Desktop releases

A `v*` tag runs `.github/workflows/tauri.yml` and opens a draft GitHub Release for Windows, Linux (Ubuntu 22.04), and macOS (Apple Silicon and Intel).

### Roadmap

1. Import extra language packs from the UI (`importLanguagePackStub` in `src/i18n/index.ts`).
2. Import, export, and share themes. Custom themes stay in local `localStorage`.
3. Desktop polish: system menu, recent files, and dropping several files on the window.

Word export and double-click open already ship in 0.2.0. Double-click open applies to the installed desktop app.

### Contributing

Issues and pull requests are welcome. Contributions are licensed under **GPL-3.0-or-later**. The app license does not cover the contents of your `.md` files.

Copyright (C) 2026 MDyar contributors. See [LICENSE](./LICENSE).
