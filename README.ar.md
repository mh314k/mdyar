# MDyar

**محرّر Markdown ثنائي الاتجاه للويب وسطح المكتب**

اكتب الفارسية والعربية والإنجليزية ونصوصاً مختلطة في مستند واحد — يحافظ كل مقطع على الاتجاه الصحيح تلقائياً.

[![Latest release](https://img.shields.io/github/v/release/mh314k/mdyar?display_name=tag&sort=semver)](https://github.com/mh314k/mdyar/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/mh314k/mdyar/total)](https://github.com/mh314k/mdyar/releases)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/mh314k/mdyar)](https://github.com/mh314k/mdyar/stargazers)
[![Issues](https://img.shields.io/github/issues/mh314k/mdyar)](https://github.com/mh314k/mdyar/issues)
[![Desktop build](https://img.shields.io/github/actions/workflow/status/mh314k/mdyar/tauri.yml?label=desktop%20build)](https://github.com/mh314k/mdyar/actions/workflows/tauri.yml)
[![Web deploy](https://img.shields.io/github/actions/workflow/status/mh314k/mdyar/pages.yml?label=web%20deploy)](https://github.com/mh314k/mdyar/actions/workflows/pages.yml)

[تجربة على الويب](https://mh314k.github.io/mdyar/) · [التنزيلات](https://github.com/mh314k/mdyar/releases) · [دليل المطوّرين](docs/DEVELOPMENT.md)

| [English](README.md) | [فارسی](README.fa.md) | [العربية](README.ar.md) | [Русский](README.ru.md) | [中文](README.zh-CN.md) |
| --- | --- | --- | --- | --- |

![MDyar — عرض مقسّم مع مستند الترحيب](docs/images/mdyar-screenshot.png)

---

## لماذا MDyar

معظم محرّرات Markdown مبنية لنص من اليسار إلى اليمين. **صُمّم MDyar لسير عمل ثنائي اللغة وRTL حقيقي:** فقرات وجداول وقوائم مختلطة؛ معاينة وتصدير يحترمان الاتجاه؛ مكتب مكتبي مع تبويبات وسمات واستكشاف المجلدات.

## أبرز الميزات

| | |
| --- | --- |
| **الاتجاه** | تلقائي لكل مقطع وسطر (UAX #9)؛ قفل اختياري `<!-- mdyar:dir=rtl -->` للتصدير |
| **العروض** | معاينة، تقسيم (تمرير متزامن مع رقم السطر)، تحرير |
| **Markdown غني** | GFM، KaTeX، Mermaid |
| **التصدير** | HTML مستقل وWord (.docx) |
| **السمات** | لوحات جاهزة + محرّر سمات مخصّص |
| **لغة الواجهة** | English · فارسی · العربية |
| **المنصّات** | متصفح وتطبيق أصلي (Windows، macOS، Linux) |

## احصل على MDyar

### في المتصفح

بدون تثبيت — افتح **[MDyar على GitHub Pages](https://mh314k.github.io/mdyar/)**.

افتح الملفات من جهازك؛ **الحفظ** يحمّل `.md` محدّثاً. تُخزَّن الجلسة في المتصفح.

### تطبيق سطح المكتب

حمّل أحدث إصدار من **[Releases](https://github.com/mh314k/mdyar/releases)**.

- حفظ و**حفظ باسم** على مسارات حقيقية  
- **فتح مجلد** بشجرة تحميل كسول (ملفات MD/نص قابلة للتحرير)  
- عمليات الملفات على سطح المكتب: ملف/مجلد جديد، إعادة تسمية، حذف، نسخ/قص/لصق (قائمة سياق + اختصارات)  
- تبويبات متعددة؛ علامة `*` للتغييرات غير المحفوظة؛ مزامنة التبويبات عند نقل الملفات أو حذفها  
- ربط `.md` / `.markdown` / `.mdown` بعد التثبيت  
- استعادة مساحة العمل عند التشغيل التالي  

البناء من المصدر: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## الويب مقابل سطح المكتب

| | الويب | سطح المكتب |
| --- | --- | --- |
| فتح ملف | منتقي المتصفح | حوار النظام |
| مجلد المشروع | منتقي المجلد (Chromium) | شجرة المستكشف + عمليات الملفات |
| حفظ | تنزيل | كتابة على المسار |
| حفظ باسم | — | ✓ |
| HTML / Word | تنزيل | حوار حفظ |
| نقرتان على `.md` | — | ✓ (بعد التثبيت) |

## المساهمة والملاحظات

نرحّب بتقارير الأخطاء والأفكار وطلبات السحب.

- [افتح issue](https://github.com/mh314k/mdyar/issues/new/choose) — أخطاء، طلبات ميزات، فجوات الترجمة  
- اطّلع على [المسائل الحالية](https://github.com/mh314k/mdyar/issues) قبل فتح تكرار  
- لطلبات السحب: انظر [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)؛ المساهمات مرخّصة تحت **GPL-3.0-or-later**

إن أفادك MDyar، فإن [نجمة على GitHub](https://github.com/mh314k/mdyar) محل تقدير.

## الترخيص

برمجيات حرة تحت **[GPL-3.0-or-later](LICENSE)**. محتوى Markdown الخاص بك يبقى لك — الترخيص يغطي البرنامج لا مستنداتك.

**Copyright © 2026 MDyar contributors**
