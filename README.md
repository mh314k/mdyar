# MDyar

ویرایشگر مارک‌داون برای متن دوجهته. فارسی، عربی و انگلیسی در یک پاراگراف، جدول یا فهرست کنار هم می‌مانند و جهت هر بند از خود همان بند تعیین می‌شود.

نسخهٔ **۰٫۶٫۰**. وب و دسکتاپ (ویندوز، مک، لینوکس). مجوز: **GPL-3.0-or-later**.

وب‌اپ: **https://mh314k.github.io/mdyar/**

[English](#english)

## امکانات

- سه نما: پیش‌نمایش، اسپلیت (پیمایش هم‌گام با شمارهٔ خط منبع)، ویرایش
- جهت خودکار هر بلوک و هر سطر بر اساس نخستین حرف قوی (UAX #9)، مستقل از زبان رابط
- قفل جهت با کامنت `<!-- mdyar:dir=rtl -->` — در MDyar اعمال می‌شود و در بقیهٔ برنامه‌ها دیده نمی‌شود
- GFM، فرمول KaTeX، نمودار Mermaid
- تکمیل ساختار مارک‌داون و دستورات Mermaid داخل فنس مربوط
- تم‌های آماده به‌همراه مدیر تم سفارشی (رنگ، فونت، اندازه، فاصلهٔ خط)
- رابط English / فارسی / العربية — انتخاب زبان با آیکون کره، حتی اگر برچسب فعلی خوانا نباشد
- خروجی HTML و Word
- پوستهٔ دسکتاپ با Tauri 2: ذخیره روی دیسک، ذخیره به‌عنوان، هشدار خروج با تغییر ذخیره‌نشده، باز شدن `.md` با دوبار کلیک

اولین اجرا سند خوش‌آمد را باز می‌کند. نقطه کنار نام فایل یعنی بافر نسبت به آخرین ذخیره تغییر کرده است.

## وب

پیش‌نیاز: [Node.js 22](https://nodejs.org/).

```bash
npm install
npm run dev
```

سپس http://127.0.0.1:1420. پورت ثابت است تا پوستهٔ دسکتاپ به همان سرور وصل شود.

در مرورگر، باز کردن فایل را داخل صفحه می‌خواند و مسیر دیسک را نگه نمی‌دارد. ذخیره یعنی دانلود `.md`. «ذخیره به‌عنوان» فقط در دسکتاپ هست.

ساخت استاتیک برای GitHub Pages (پایهٔ `/mdyar/`):

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

خروجی در `dist/` است. پوش به `main` یا `master` ورک‌فلؤ Pages را اجرا می‌کند. در مخزن: Settings → Pages → Source → **GitHub Actions**.

## دسکتاپ

پیش‌نیاز: Node.js 22، [Rust](https://rustup.rs/)، و WebView سیستم (WebView2 در ویندوز، WebKitGTK در لینوکس).

```bash
npm install
npm run tauri:dev
npm run tauri:build
```

`tauri:build` اول آیکون‌ها را می‌سازد. از روی نشان برنامه: `npx tauri icon public/mdyar.svg`.

پنجرهٔ پیش‌فرض ۱۲۰۰×۸۰۰ (حداقل ۷۲۰×۴۸۰). شناسه: `app.mdyar.desktop`.

نصب‌کننده پسوندهای `.md`، `.markdown` و `.mdown` را ثبت می‌کند — این ثبت در `tauri dev` انجام نمی‌شود. برنامه تک‌نمونه‌ای است: دوبار کلیک بعدی همان پنجره را جلو می‌آورد. اگر تغییر ذخیره‌نشده باشد، قبل از جایگزینی سند پرسیده می‌شود.

**Proxifier Portable** داخل WebView2 تزریق می‌شود و پنجره را با خطای `WS2_32.dll` می‌بندد. اگر `proxifier.exe` یا `helper64.exe` در حال اجرا باشد، MDyar قبل از باز شدن هشدار می‌دهد. Portable را ببندید یا از نسخهٔ نصب‌شده (WFP) استفاده کنید. `npm run dev` در مرورگر تحت تأثیر نیست.

| | وب | دسکتاپ |
| --- | --- | --- |
| باز کردن | انتخابگر مرورگر؛ مسیر نگه داشته نمی‌شود | گفتگوی سیستم، خواندن از دیسک |
| ذخیره | دانلود `.md` | نوشتن روی مسیر جاری |
| ذخیره به‌عنوان | ندارد | دارد |
| HTML / Word | دانلود | گفتگوی ذخیره |
| دوبار کلیک روی `.md` | ندارد | بعد از نصب |

## مارک‌داون

خط لوله: remark-parse، remark-gfm، remark-math، دایرکتیو جهت MDyar، سپس rehype-katex و sanitize. HTML خام سند اجرا نمی‌شود.

جهت هر بلوک پیش‌نمایش و هر سطر ویرایشگر صریح است (`dir="rtl"` / `dir="ltr"`). بدنهٔ ویرایشگر چپ‌به‌راست می‌ماند تا شمارهٔ خط جابه‌جا نشود. بلوک کد و نمودار همیشه LTR هستند.

```markdown
<!-- mdyar:dir=rtl -->
Markdown یک زبان نشانه‌گذاری سبک است؛ این بخش به اجبار راست‌به‌چپ است.
<!-- /mdyar:dir -->
```

فرم کوتاه `<!-- mdyar:rtl -->` و فرم `<!-- mdyar:dir:rtl O --> … <!-- mdyar:dir:rtl C -->` هم پشتیبانی می‌شوند. در پیش‌نمایش می‌توان روی بند نگه داشت یا چند بند را انتخاب کرد و RTL/LTR گذاشت.

قطعه‌های تکمیل در `src/editor/markdownAutocomplete.ts` تعریف شده‌اند. تکمیل واژه‌ای پیش‌فرض CodeMirror خاموش است. وسط سطر با تایپ فارسی یا عربی منو باز نمی‌شود؛ Ctrl+Space همهٔ قطعه‌ها را نشان می‌دهد.

## خروجی

**HTML.** صفحهٔ مستقل با متغیرهای تم فعال. استایل KaTeX و رسم Mermaid از CDN می‌آیند؛ فرمول و نمودار صادرشده به شبکه نیاز دارند.

**Word.** عنوان، پاراگراف، نقل‌قول، فهرست تودرتو، چک‌لیست، جدول (با جهت دیداری مناسب)، ضخیم/کج/خط‌خورده، کد درون‌خط، پیوند وب، پاورقی، و جهت پاراگراف حفظ می‌شوند. بلوک کد، فرمول، Mermaid و تصویر به‌صورت متن می‌مانند.

## تم و زبان

تم‌های آماده: Signal Light، Signal Dark، Signal Slate، Paper، Midnight، Sand، Dusk، Contrast، Ember.

فونت پیش‌نمایش Vazirmatn و Sora؛ ویرایشگر JetBrains Mono با Vazirmatn. تم سفارشی در `localStorage` همین دستگاه است. ویرایش تم آماده یک کپی می‌سازد. شناسه‌های قدیمی `pine-light`، `pine-dark` و `slate-paper` به Signal نگاشت می‌شوند.

زبان رابط از انتخاب قبلی یا زبان مرورگر (`fa`، `ar`، در غیر این صورت `en`) می‌آید.

## ساختار

```
src/app/        پوسته، نوار ابزار، درباره، سند نمونه
src/bidi/       تشخیص جهت و پارسر تگ MDyar
src/editor/     CodeMirror، برجسته‌سازی، تکمیل
src/preview/    تبدیل مارک‌داون، پیش‌نمایش، هم‌گام‌سازی
src/export/     HTML و Word
src/themes/     مدل و مدیر تم
src/i18n/       en / fa / ar
src/platform/   فایل در وب در برابر Tauri
src-tauri/      پوستهٔ بومی
```

React 19، TypeScript، Vite 6، unified، `docx`، Tauri 2.

## انتشار دسکتاپ

تگ `v*` (مثلاً `v0.6.0`) ورک‌فلؤ `.github/workflows/tauri.yml` را اجرا می‌کند و Release برای ویندوز، لینوکس (Ubuntu 22.04) و مک (Apple Silicon و Intel) می‌سازد.

## مشارکت

مسئله و درخواست ادغام خوش‌آمد است. سهم شما تحت GPL-3.0-or-later منتشر می‌شود. مجوز برنامه به محتوای فایل‌های `.md` سرایت نمی‌کند.

متن کامل مجوز در [LICENSE](./LICENSE). Copyright (C) 2026 MDyar contributors.

---

## English

MDyar is a Markdown editor for bidirectional text. Persian, Arabic, and English can share a paragraph, table, or list; each block takes its direction from its own first strong character.

Version **0.6.0**. Browser and desktop (Windows, macOS, Linux). License: **GPL-3.0-or-later**.

Web app: **https://mh314k.github.io/mdyar/**

### Features

- Preview, split (scroll synced by source line), and edit
- Per-block and per-line direction via UAX #9, independent of the UI language
- Forced direction comments (`<!-- mdyar:dir=rtl -->`) honored in the editor, preview, HTML, and Word; ignored elsewhere
- GFM, KaTeX, Mermaid
- Structural Markdown snippets and Mermaid-aware completion inside fences
- Built-in themes plus a custom theme manager
- English / فارسی / العربية — globe control so the switcher stays findable
- HTML and Word export
- Tauri 2 desktop: disk save, save as, unsaved-close prompt, file-type association

The first launch opens the bundled welcome document.

### Web

Node.js 22.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:1420. In the browser, Open does not keep a disk path; Save downloads `.md`.

```bash
GITHUB_PAGES=true npm run build
```

On Windows cmd: `set GITHUB_PAGES=true`. On PowerShell: `$env:GITHUB_PAGES = "true"`. Output is `dist/`. Pushes to `main` or `master` deploy via GitHub Actions.

### Desktop

Node.js 22, [Rust](https://rustup.rs/), system WebView.

```bash
npm install
npm run tauri:dev
npm run tauri:build
```

File associations are registered by the installer, not by `tauri dev`. The app is single-instance.

Proxifier Portable injects into WebView2 and crashes the window (`WS2_32.dll`). Quit Portable or use the installed WFP edition. Browser `npm run dev` is unaffected.

| | Web | Desktop |
| --- | --- | --- |
| Open | File picker; no path kept | Native dialog |
| Save | Download `.md` | Write current path |
| Save as | No | Yes |
| HTML / Word | Download | Save dialog |
| Double-click `.md` | No | After install |

### Markdown and export

The preview pipeline is remark + GFM + math + the MDyar direction plugin, then KaTeX and sanitize. Raw HTML is stripped. Code and diagrams stay LTR.

HTML export is a standalone page using the active theme; KaTeX and Mermaid load from a CDN. Word keeps structure, inline formatting, tables, footnotes, and paragraph direction. Code blocks, math, Mermaid, and images are written as text.

Snippets live in `src/editor/markdownAutocomplete.ts`. Default word completion is off. Mid-line Persian or Arabic typing does not open the menu.

### Themes

Signal Light, Signal Dark, Signal Slate, Paper, Midnight, Sand, Dusk, Contrast, Ember. Custom themes stay in `localStorage`. Legacy ids `pine-light`, `pine-dark`, and `slate-paper` map to Signal.

### Desktop releases

A `v*` tag runs `.github/workflows/tauri.yml` for Windows, Linux (Ubuntu 22.04), and macOS (Apple Silicon and Intel).

### Contributing

Issues and pull requests are welcome under **GPL-3.0-or-later**. The app license does not cover the contents of your `.md` files. See [LICENSE](./LICENSE).
