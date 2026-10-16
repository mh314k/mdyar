import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";
import { rehypeSourceLine } from "./rehypeSourceLine";
import { remarkDirDirective } from "./remarkDirDirective";
import { firstStrongDirection } from "../bidi/direction";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const DIR_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "table",
  "td",
  "th",
  "figcaption",
]);

function hastText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (node.tagName === "pre") return "";
  return (node.children ?? []).map(hastText).join("");
}

/** Set explicit rtl/ltr from forced directive or first-strong text — more reliable than dir=auto in Firefox. */
export function rehypeBidiDir() {
  return (tree: HastNode) => {
    const walk = (
      node: HastNode,
      inheritedDir?: "ltr" | "rtl",
      inheritedForced?: "ltr" | "rtl",
    ) => {
      let currentDir = inheritedDir;
      let currentForced = inheritedForced;
      if (node.type === "element" && node.tagName) {
        node.properties ??= {};
        const explicit = node.properties.dir;
        const stamped = node.properties.dataMdyarForced;
        if (stamped === "ltr" || stamped === "rtl") {
          currentForced = stamped;
        }
        if (explicit === "ltr" || explicit === "rtl") {
          currentDir = explicit;
        } else if (DIR_TAGS.has(node.tagName)) {
          const resolved = currentDir ?? firstStrongDirection(hastText(node));
          node.properties.dir = resolved;
          if (currentForced) node.properties.dataMdyarForced = currentForced;
        }
      }
      for (const child of node.children ?? []) {
        walk(child, currentDir, currentForced);
      }
    };
    walk(tree);
  };
}

const schema: Schema = {
  ...defaultSchema,
  // Footnote ids already start with `user-content-`. Prefixing again
  // makes the back-link point at an id that is not in the page.
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./, "math-inline", "math-display"],
    ],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"], ["style"]],
    div: [...(defaultSchema.attributes?.div ?? []), ["className"], ["style"]],
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      ["dir"],
      ["dataSourceLine"],
      ["dataSourceEndLine"],
      ["dataMdyarForced"],
    ],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "span", "div"],
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirDirective)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSourceLine)
  .use(rehypeBidiDir)
  .use(rehypeKatex)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

export async function markdownToHtml(source: string): Promise<string> {
  const file = await processor.process(source);
  return String(file);
}

/** Extract mermaid source blocks for client-side rendering. */
export function extractMermaidBlocks(source: string): { id: string; code: string }[] {
  const re = /```mermaid\n([\s\S]*?)```/g;
  const blocks: { id: string; code: string }[] = [];
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    blocks.push({ id: `mermaid-${i++}`, code: match[1].trim() });
  }
  return blocks;
}
