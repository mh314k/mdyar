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
    ],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "span", "div"],
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSourceLine)
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
