import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  FootnoteReferenceRun,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ILevelsOptions,
  type INumberingOptions,
  type ParagraphChild,
} from "docx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { AppLanguage } from "../i18n";
import { saveBinaryDocument, type SaveResult } from "../platform/fs";

type MdNode = {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  checked?: boolean | null;
  url?: string;
  alt?: string;
  lang?: string;
  identifier?: string;
  children?: MdNode[];
};

type Marks = {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: boolean;
};

type NumberingConfig = INumberingOptions["config"][number];

type Ctx = {
  seq: { n: number };
  numbering: NumberingConfig[];
  noteIds: Map<string, number>;
  docRtl: boolean;
  quote: number;
  listDepth: number;
  bidiLang: string;
};

const HEADING = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

function bidiLanguage(language: AppLanguage): string {
  if (language === "ar") return "ar-SA";
  if (language === "en") return "en-US";
  return "fa-IR";
}

function documentIsRtl(markdown: string): boolean {
  let rtl = 0;
  let ltr = 0;
  for (const ch of markdown) {
    if (RTL_CHAR.test(ch)) rtl += 1;
    else if (/[A-Za-z]/.test(ch)) ltr += 1;
  }
  return rtl >= ltr;
}

function paragraphIsRtl(text: string, fallback: boolean): boolean {
  for (const ch of text) {
    if (/\s/u.test(ch)) continue;
    if (RTL_CHAR.test(ch)) return true;
    if (/[A-Za-z0-9]/.test(ch)) return false;
  }
  return fallback;
}

function nodeText(node: MdNode): string {
  if (
    node.type === "text" ||
    node.type === "inlineCode" ||
    node.type === "code" ||
    node.type === "inlineMath" ||
    node.type === "math" ||
    node.type === "html"
  ) {
    return node.value ?? "";
  }
  return (node.children ?? []).map(nodeText).join("");
}

function listLevels(ordered: boolean, start: number, rtl: boolean): ILevelsOptions[] {
  const inset = (level: number) => 420 * (level + 1);
  return Array.from({ length: 8 }, (_, level) => ({
    level,
    format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
    text: ordered ? `%${level + 1}.` : "•",
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    start: level === 0 ? start : 1,
    style: {
      paragraph: {
        indent: rtl
          ? { right: inset(level), hanging: 360 }
          : { left: inset(level), hanging: 360 },
      },
    },
  }));
}

export async function markdownToDocxBlob(options: {
  markdown: string;
  language: AppLanguage;
  title?: string;
}): Promise<Blob> {
  const { markdown, language, title } = options;
  const tree = parser.parse(markdown) as MdNode;
  const ctx: Ctx = {
    seq: { n: 0 },
    numbering: [],
    noteIds: new Map(),
    docRtl: documentIsRtl(markdown),
    quote: 0,
    listDepth: 0,
    bidiLang: bidiLanguage(language),
  };

  const body = convertBlocks(tree.children ?? [], ctx);
  const footnotes = buildFootnotes(tree, ctx);
  const doc = new Document({
    title: title || "MDyar",
    creator: "MDyar",
    description: "Exported from MDyar",
    numbering: ctx.numbering.length ? { config: ctx.numbering } : undefined,
    footnotes: Object.keys(footnotes).length ? footnotes : undefined,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: body.length ? body : [new Paragraph({})],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function exportWordDocument(options: {
  markdown: string;
  filename: string;
  language: AppLanguage;
}): Promise<SaveResult | null> {
  const base = options.filename.replace(/\.(md|markdown|mdown)$/i, "");
  const blob = await markdownToDocxBlob({
    markdown: options.markdown,
    language: options.language,
    title: base || "MDyar",
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return saveBinaryDocument(
    bytes,
    `${base || "untitled"}.docx`,
    { name: "Word", extensions: ["docx"] },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

function buildFootnotes(
  root: MdNode,
  ctx: Ctx,
): Record<string, { children: readonly Paragraph[] }> {
  const defs = new Map<string, MdNode>();
  for (const child of root.children ?? []) {
    if (child.type === "footnoteDefinition" && child.identifier) {
      defs.set(child.identifier, child);
    }
  }
  const notes: Record<string, { children: readonly Paragraph[] }> = {};
  for (const [identifier, id] of ctx.noteIds) {
    const def = defs.get(identifier);
    const blocks = def ? convertBlocks(def.children ?? [], { ...ctx, quote: 0 }) : [];
    const paragraphs = blocks.filter((block): block is Paragraph => block instanceof Paragraph);
    notes[String(id)] = {
      children: paragraphs.length
        ? paragraphs
        : [textParagraph(def ? nodeText(def) : identifier, ctx, paragraphIsRtl(identifier, ctx.docRtl))],
    };
  }
  return notes;
}

function convertBlocks(nodes: MdNode[], ctx: Ctx): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];
  for (const node of nodes) {
    if (node.type === "footnoteDefinition") continue;
    out.push(...convertBlock(node, ctx));
  }
  return out;
}

function convertBlock(node: MdNode, ctx: Ctx): Array<Paragraph | Table> {
  switch (node.type) {
    case "heading":
      return [heading(node, ctx)];
    case "paragraph":
      return [flowParagraph(node, ctx)];
    case "blockquote":
      return convertBlocks(node.children ?? [], { ...ctx, quote: ctx.quote + 1 });
    case "list":
      return convertList(node, ctx);
    case "code":
      return codeBlock(node, ctx);
    case "math":
      return [
        textParagraph(node.value ?? "", { ...ctx, quote: 0 }, false, { code: true }),
      ];
    case "thematicBreak":
      return [
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 },
          },
          spacing: { before: 160, after: 160 },
          children: [new TextRun("")],
        }),
      ];
    case "table":
      return [table(node, ctx)];
    case "html": {
      const text = (node.value ?? "").replace(/<[^>]+>/g, "").trim();
      return text ? [textParagraph(text, ctx, paragraphIsRtl(text, ctx.docRtl))] : [];
    }
    default:
      if (node.children?.length) return convertBlocks(node.children, ctx);
      return [];
  }
}

function heading(node: MdNode, ctx: Ctx): Paragraph {
  const depth = Math.min(Math.max(node.depth ?? 1, 1), 6);
  const text = nodeText(node);
  const rtl = paragraphIsRtl(text, ctx.docRtl);
  return paragraph(phrasing(node.children ?? [], rtl, {}, ctx), ctx, {
    rtl,
    heading: HEADING[depth],
  });
}

function flowParagraph(
  node: MdNode,
  ctx: Ctx,
  extra?: { numbering?: { reference: string; level: number }; taskPrefix?: string; rtl?: boolean },
): Paragraph {
  const text = `${extra?.taskPrefix ?? ""}${nodeText(node)}`;
  const rtl = extra?.rtl ?? paragraphIsRtl(text, ctx.docRtl);
  const children = phrasing(node.children ?? [], rtl, {}, ctx);
  if (extra?.taskPrefix) {
    children.unshift(run(extra.taskPrefix, rtl, {}, ctx));
  }
  return paragraph(children, ctx, {
    rtl,
    numbering: extra?.numbering,
    indent: extra?.taskPrefix ? 420 * (ctx.listDepth + 1) : undefined,
  });
}

function textParagraph(
  text: string,
  ctx: Ctx,
  rtl: boolean,
  marks: Marks = {},
): Paragraph {
  return paragraph([run(text || " ", rtl, marks, ctx)], ctx, {
    rtl,
    code: marks.code,
  });
}

function codeBlock(node: MdNode, ctx: Ctx): Paragraph[] {
  const lang = node.lang?.trim();
  const lines = (node.value ?? "").replace(/\n$/, "").split("\n");
  const label = lang
    ? [
        paragraph([run(lang, false, { italics: true }, ctx)], ctx, {
          rtl: false,
          after: 40,
        }),
      ]
    : [];
  const body = (lines.length ? lines : [""]).map((line) =>
    paragraph([run(line || " ", false, { code: true }, ctx)], ctx, {
      rtl: false,
      code: true,
      after: 0,
    }),
  );
  return [...label, ...body];
}

function table(node: MdNode, ctx: Ctx): Table {
  const rows = node.children ?? [];
  const headerText = rows[0] ? nodeText(rows[0]) : "";
  const rtl = paragraphIsRtl(headerText, ctx.docRtl);
  const edge = { style: BorderStyle.SINGLE, size: 4, color: "auto" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: rtl,
    rows: rows.map((row, rowIndex) => {
      const cells = row.children ?? [];
      return new TableRow({
        tableHeader: rowIndex === 0,
        children: cells.map((cell) => {
          const cellText = nodeText(cell);
          const cellRtl = paragraphIsRtl(cellText, rtl);
          return new TableCell({
            width: { size: Math.floor(100 / Math.max(cells.length, 1)), type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            borders: { top: edge, bottom: edge, left: edge, right: edge },
            children: [
              paragraph(phrasing(cell.children ?? [], cellRtl, { bold: rowIndex === 0 }, ctx), ctx, {
                rtl: cellRtl,
                after: 0,
              }),
            ],
          });
        }),
      });
    }),
  });
}

function convertList(node: MdNode, ctx: Ctx): Array<Paragraph | Table> {
  const ordered = node.ordered === true;
  const listRtl = paragraphIsRtl(nodeText(node), ctx.docRtl);
  const reference = `mdyar-list-${++ctx.seq.n}`;
  const depth = Math.min(ctx.listDepth, 7);
  ctx.numbering.push({
    reference,
    levels: listLevels(ordered, node.start ?? 1, listRtl),
  });
  const out: Array<Paragraph | Table> = [];
  for (const item of node.children ?? []) {
    if (item.type !== "listItem") continue;
    const task = item.checked === true || item.checked === false;
    let usedNumber = false;
    const nested = { ...ctx, listDepth: depth + 1 };
    for (const child of item.children ?? []) {
      if (child.type === "paragraph" && !usedNumber) {
        out.push(
          flowParagraph(child, ctx, {
            numbering: task ? undefined : { reference, level: depth },
            taskPrefix: task ? (item.checked ? "☑ " : "☐ ") : undefined,
            rtl: listRtl,
          }),
        );
        usedNumber = true;
      } else if (child.type === "list") {
        out.push(...convertList(child, nested));
      } else {
        out.push(...convertBlock(child, nested));
      }
    }
  }
  return out;
}

function phrasing(nodes: MdNode[], rtl: boolean, marks: Marks, ctx: Ctx): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.type === "strong") {
      out.push(...phrasing(node.children ?? [], rtl, { ...marks, bold: true }, ctx));
    } else if (node.type === "emphasis") {
      out.push(...phrasing(node.children ?? [], rtl, { ...marks, italics: true }, ctx));
    } else if (node.type === "delete") {
      out.push(...phrasing(node.children ?? [], rtl, { ...marks, strike: true }, ctx));
    } else if (node.type === "link") {
      const inner = phrasing(node.children ?? [], rtl, { ...marks, link: true }, ctx);
      const href = node.url ?? "";
      if (/^(https?:|mailto:)/i.test(href) && inner.length) {
        out.push(new ExternalHyperlink({ link: href, children: inner }));
      } else {
        out.push(...inner);
      }
    } else if (node.type === "inlineCode") {
      out.push(run(node.value ?? "", rtl, { ...marks, code: true }, ctx));
    } else if (node.type === "inlineMath") {
      out.push(run(node.value ?? "", false, { code: true }, ctx));
    } else if (node.type === "footnoteReference" && node.identifier) {
      const id = noteNumber(ctx, node.identifier);
      out.push(new FootnoteReferenceRun(id));
    } else if (node.type === "break") {
      out.push(new TextRun({ break: 1 }));
    } else if (node.type === "image") {
      const label = node.alt || node.url || "";
      if (label) out.push(run(label, rtl, { ...marks, italics: true }, ctx));
    } else if (node.type === "html") {
      const text = (node.value ?? "").replace(/<[^>]+>/g, "");
      if (text) out.push(run(text, rtl, marks, ctx));
    } else if (node.type === "text") {
      if (node.value) out.push(run(node.value, rtl, marks, ctx));
    } else if (node.children?.length) {
      out.push(...phrasing(node.children, rtl, marks, ctx));
    }
  }
  return out;
}

function noteNumber(ctx: Ctx, identifier: string): number {
  const existing = ctx.noteIds.get(identifier);
  if (existing) return existing;
  const id = ctx.noteIds.size + 1;
  ctx.noteIds.set(identifier, id);
  return id;
}

function run(text: string, rtl: boolean, marks: Marks, ctx: Ctx): TextRun {
  const code = Boolean(marks.code);
  return new TextRun({
    text,
    bold: marks.bold,
    boldComplexScript: marks.bold,
    italics: marks.italics,
    italicsComplexScript: marks.italics,
    strike: marks.strike,
    rightToLeft: rtl && !code,
    style: marks.link ? "Hyperlink" : undefined,
    font: code ? "Consolas" : undefined,
    language: {
      value: rtl ? ctx.bidiLang : "en-US",
      bidirectional: ctx.bidiLang,
    },
  });
}

function paragraph(
  children: ParagraphChild[],
  ctx: Ctx,
  options: {
    rtl: boolean;
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    numbering?: { reference: string; level: number };
    code?: boolean;
    before?: number;
    after?: number;
    indent?: number;
  },
): Paragraph {
  const quoteIndent = ctx.quote * 360;
  const indentStart = quoteIndent + (options.indent ?? 0);
  return new Paragraph({
    bidirectional: options.rtl,
    alignment: options.rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    heading: options.heading,
    numbering: options.numbering,
    spacing: options.code ? { before: options.before ?? 0, after: options.after ?? 0 } : undefined,
    indent: indentStart
      ? options.rtl
        ? { right: indentStart }
        : { left: indentStart }
      : undefined,
    children: children.length ? children : [new TextRun("")],
  });
}
