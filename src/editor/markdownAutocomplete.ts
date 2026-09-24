import {
  autocompletion,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";

type Snippet = {
  label: string;
  detail: string;
  template: string;
  /** Prefer these at the start of a line (after indent). */
  lineStart?: boolean;
  boost?: number;
  aliases?: string[];
};

const SNIPPETS: Snippet[] = [
  { label: "#", detail: "Heading 1", template: "# #{title}", lineStart: true, boost: 10 },
  { label: "##", detail: "Heading 2", template: "## #{title}", lineStart: true, boost: 9 },
  { label: "###", detail: "Heading 3", template: "### #{title}", lineStart: true, boost: 8 },
  { label: "####", detail: "Heading 4", template: "#### #{title}", lineStart: true },
  { label: "#####", detail: "Heading 5", template: "##### #{title}", lineStart: true },
  { label: "######", detail: "Heading 6", template: "###### #{title}", lineStart: true },
  {
    label: "-",
    detail: "Bullet list",
    template: "- #{item}",
    lineStart: true,
    aliases: ["ul", "list"],
  },
  {
    label: "1.",
    detail: "Numbered list",
    template: "1. #{item}",
    lineStart: true,
    aliases: ["ol", "ordered"],
  },
  {
    label: "- [ ]",
    detail: "Task list",
    template: "- [ ] #{task}",
    lineStart: true,
    aliases: ["todo", "task", "checkbox"],
  },
  {
    label: ">",
    detail: "Quote",
    template: "> #{quote}",
    lineStart: true,
    aliases: ["quote", "blockquote"],
  },
  {
    label: "```",
    detail: "Code block",
    template: "```#{lang}\n#{code}\n```",
    lineStart: true,
    aliases: ["code", "fence"],
  },
  {
    label: "```mermaid",
    detail: "Mermaid diagram",
    template: "```mermaid\n#{diagram}\n```",
    lineStart: true,
    aliases: ["mermaid", "diagram"],
  },
  {
    label: "|",
    detail: "Table",
    template: "| #{col1} | #{col2} |\n| --- | --- |\n| #{cell1} | #{cell2} |",
    lineStart: true,
    aliases: ["table"],
  },
  { label: "---", detail: "Horizontal rule", template: "---", lineStart: true, aliases: ["hr", "rule"] },
  {
    label: "$$",
    detail: "Math block",
    template: "$$\n#{expr}\n$$",
    lineStart: true,
    aliases: ["equation"],
  },
  { label: "[]()", detail: "Link", template: "[#{text}](#{url})", aliases: ["link", "url"] },
  { label: "![]()", detail: "Image", template: "![#{alt}](#{url})", aliases: ["image", "img"] },
  { label: "**", detail: "Bold", template: "**#{text}**", aliases: ["bold", "strong"] },
  { label: "*", detail: "Italic", template: "*#{text}*", aliases: ["italic", "em"] },
  { label: "~~", detail: "Strikethrough", template: "~~#{text}~~", aliases: ["strike"] },
  { label: "`", detail: "Inline code", template: "`#{code}`", aliases: ["inline"] },
  { label: "$", detail: "Inline math", template: "$#{expr}$", aliases: ["math", "katex"] },
  {
    label: "[^]",
    detail: "Footnote",
    template: "[^#{id}]\n\n[^#{id}]: #{note}",
    aliases: ["footnote"],
  },
];

function matchesQuery(query: string, snippet: Snippet): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (snippet.label.toLowerCase().startsWith(q)) return true;
  if (snippet.detail.toLowerCase().includes(q)) return true;
  return (snippet.aliases ?? []).some(
    (alias) => alias.startsWith(q) || alias.includes(q),
  );
}

function toCompletion(snippet: Snippet): Completion {
  return snippetCompletion(snippet.template, {
    label: snippet.label,
    detail: snippet.detail,
    type: "keyword",
    boost: snippet.boost ?? 0,
  });
}

/**
 * Suggest Markdown structure only: headings, lists, fences, links, etc.
 * Does not complete ordinary prose words.
 */
export function markdownCompletionSource(
  context: CompletionContext,
): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const match = before.match(/(^|\s)([^\s]{0,24})$/);
  const query = match?.[2] ?? "";
  const from = context.pos - query.length;
  const lineStart = /^\s*$/.test(before.slice(0, from - line.from));

  if (!context.explicit && query.length === 0) return null;

  // Avoid completing while typing normal Persian/Arabic/Latin words mid-sentence.
  if (
    !context.explicit &&
    !lineStart &&
    /^[\p{L}\p{N}_]+$/u.test(query) &&
    !SNIPPETS.some((s) => (s.aliases ?? []).some((a) => a.startsWith(query.toLowerCase())))
  ) {
    return null;
  }

  const options = SNIPPETS.filter((snippet) => {
    if (snippet.lineStart && !lineStart && !context.explicit) {
      // Still allow `#` / `-` when the whole line token is that markup.
      if (!matchesQuery(query, snippet)) return false;
      if (!/^[#>*\-|`1.[\]]/.test(query)) return false;
    }
    return matchesQuery(query, snippet);
  }).map(toCompletion);

  if (!options.length) return null;
  return {
    from,
    options,
    validFor: /^[^\s]{0,24}$/,
  };
}

export const markdownAutocompletion = autocompletion({
  override: [markdownCompletionSource],
  activateOnTyping: true,
  icons: false,
  closeOnBlur: true,
});
