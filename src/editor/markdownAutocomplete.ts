import {
  autocompletion,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import type { Text } from "@codemirror/state";

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
    boost: 7,
    aliases: ["mermaid", "diagram", "mmd"],
  },
  {
    label: "```mermaid flowchart",
    detail: "Mermaid flowchart",
    template:
      "```mermaid\nflowchart #{LR}\n  #{A}[#{Start}] --> #{B}{#{Decision}}\n  #{B} -->|#{Yes}| #{C}[#{Done}]\n```",
    lineStart: true,
    boost: 6,
    aliases: ["mermaid", "flowchart", "graph", "flow"],
  },
  {
    label: "```mermaid sequence",
    detail: "Mermaid sequence diagram",
    template:
      "```mermaid\nsequenceDiagram\n  actor #{User}\n  participant #{App}\n  #{User}->>#{App}: #{Request}\n  #{App}-->>#{User}: #{Response}\n```",
    lineStart: true,
    boost: 5,
    aliases: ["mermaid", "sequence", "sequencediagram"],
  },
  {
    label: "```mermaid class",
    detail: "Mermaid class diagram",
    template:
      "```mermaid\nclassDiagram\n  class #{Animal} {\n    +#{name}: string\n    +#{speak}()\n  }\n```",
    lineStart: true,
    aliases: ["mermaid", "class", "classdiagram"],
  },
  {
    label: "```mermaid state",
    detail: "Mermaid state diagram",
    template:
      "```mermaid\nstateDiagram-v2\n  [*] --> #{Idle}\n  #{Idle} --> #{Active}: #{start}\n  #{Active} --> [*]\n```",
    lineStart: true,
    aliases: ["mermaid", "state", "statediagram"],
  },
  {
    label: "```mermaid er",
    detail: "Mermaid ER diagram",
    template:
      "```mermaid\nerDiagram\n  #{USER} ||--o{ #{POST} : #{writes}\n  #{USER} {\n    string #{id}\n    string #{name}\n  }\n```",
    lineStart: true,
    aliases: ["mermaid", "er", "erdiagram"],
  },
  {
    label: "```mermaid gantt",
    detail: "Mermaid Gantt chart",
    template:
      "```mermaid\ngantt\n  title #{Project schedule}\n  dateFormat YYYY-MM-DD\n  section #{Phase 1}\n    #{Task 1} :#{a1}, 2026-01-01, 7d\n```",
    lineStart: true,
    aliases: ["mermaid", "gantt"],
  },
  {
    label: "```mermaid pie",
    detail: "Mermaid pie chart",
    template:
      '```mermaid\npie title #{Distribution}\n  "#{Part A}" : 60\n  "#{Part B}" : 40\n```',
    lineStart: true,
    aliases: ["mermaid", "pie"],
  },
  {
    label: "```mermaid mindmap",
    detail: "Mermaid mindmap",
    template:
      "```mermaid\nmindmap\n  root((#{Central idea}))\n    #{Branch A}\n      #{Leaf 1}\n    #{Branch B}\n```",
    lineStart: true,
    aliases: ["mermaid", "mindmap"],
  },
  {
    label: "```mermaid timeline",
    detail: "Mermaid timeline",
    template:
      "```mermaid\ntimeline\n  title #{History}\n  #{2025} : #{Milestone 1}\n  #{2026} : #{Milestone 2}\n```",
    lineStart: true,
    aliases: ["mermaid", "timeline"],
  },
  {
    label: "```mermaid gitGraph",
    detail: "Mermaid Git graph",
    template:
      "```mermaid\ngitGraph\n  commit\n  branch #{feature}\n  checkout #{feature}\n  commit\n  checkout main\n  merge #{feature}\n```",
    lineStart: true,
    aliases: ["mermaid", "gitgraph", "git"],
  },
  {
    label: "<!-- mdyar:dir=rtl -->",
    detail: "Force RTL block (MDyar)",
    template: "<!-- mdyar:dir=rtl -->\n#{content}\n<!-- /mdyar:dir -->",
    lineStart: true,
    boost: 6,
    aliases: ["mdyar", "rtl", "dir", "bidi", "<!--"],
  },
  {
    label: "<!-- mdyar:dir=ltr -->",
    detail: "Force LTR block (MDyar)",
    template: "<!-- mdyar:dir=ltr -->\n#{content}\n<!-- /mdyar:dir -->",
    lineStart: true,
    boost: 6,
    aliases: ["mdyar", "ltr", "dir", "bidi", "<!--"],
  },
  {
    label: "<!-- /mdyar:dir -->",
    detail: "End forced direction (MDyar)",
    template: "<!-- /mdyar:dir -->",
    lineStart: true,
    aliases: ["mdyar", "/mdyar", "enddir", "closedir", "<!--"],
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

/** Completions offered when the cursor is inside a ```mermaid fenced block. */
const MERMAID_SNIPPETS: Snippet[] = [
  // Diagram headers
  {
    label: "flowchart LR",
    detail: "Flowchart left-to-right",
    template: "flowchart LR\n  #{A}[#{Start}] --> #{B}[#{End}]",
    lineStart: true,
    boost: 10,
    aliases: ["flowchart", "graph", "lr"],
  },
  {
    label: "flowchart TD",
    detail: "Flowchart top-down",
    template: "flowchart TD\n  #{A}[#{Start}] --> #{B}[#{End}]",
    lineStart: true,
    boost: 9,
    aliases: ["flowchart", "graph", "td", "tb"],
  },
  {
    label: "flowchart RL",
    detail: "Flowchart right-to-left",
    template: "flowchart RL\n  #{A}[#{Start}] --> #{B}[#{End}]",
    lineStart: true,
    aliases: ["flowchart", "rl"],
  },
  {
    label: "sequenceDiagram",
    detail: "Sequence diagram header",
    template: "sequenceDiagram\n  actor #{User}\n  participant #{Service}\n  #{User}->>#{Service}: #{Message}",
    lineStart: true,
    boost: 9,
    aliases: ["sequence"],
  },
  {
    label: "classDiagram",
    detail: "Class diagram header",
    template: "classDiagram\n  class #{ClassName} {\n    +#{field}: #{Type}\n    +#{method}()\n  }",
    lineStart: true,
    boost: 8,
    aliases: ["class"],
  },
  {
    label: "stateDiagram-v2",
    detail: "State diagram header",
    template: "stateDiagram-v2\n  [*] --> #{State1}\n  #{State1} --> [*]",
    lineStart: true,
    boost: 8,
    aliases: ["state", "statediagram"],
  },
  {
    label: "erDiagram",
    detail: "Entity-relationship diagram",
    template: "erDiagram\n  #{ENTITY_A} ||--o{ #{ENTITY_B} : #{relates}",
    lineStart: true,
    boost: 7,
    aliases: ["er"],
  },
  {
    label: "gantt",
    detail: "Gantt chart header",
    template: "gantt\n  title #{Title}\n  dateFormat YYYY-MM-DD\n  section #{Section}\n    #{Task} :#{id1}, 2026-01-01, 5d",
    lineStart: true,
    boost: 7,
    aliases: ["gantt"],
  },
  {
    label: "pie",
    detail: "Pie chart header",
    template: 'pie title #{Title}\n  "#{Label A}" : 70\n  "#{Label B}" : 30',
    lineStart: true,
    boost: 7,
    aliases: ["pie"],
  },
  {
    label: "mindmap",
    detail: "Mindmap header",
    template: "mindmap\n  root((#{Root}))\n    #{Topic A}\n    #{Topic B}",
    lineStart: true,
    boost: 7,
    aliases: ["mindmap"],
  },
  {
    label: "timeline",
    detail: "Timeline header",
    template: "timeline\n  title #{Title}\n  #{Period} : #{Event}",
    lineStart: true,
     aliases: ["timeline"],
  },
  {
    label: "gitGraph",
    detail: "Git graph header",
    template: "gitGraph\n  commit\n  branch #{dev}\n  checkout #{dev}\n  commit",
    lineStart: true,
    aliases: ["gitgraph", "git"],
  },

  // Flowchart / common statements
  {
    label: "subgraph",
    detail: "Flowchart subgraph block",
    template: "subgraph #{id}[#{Title}]\n  #{content}\nend",
    lineStart: true,
    boost: 6,
    aliases: ["subgraph", "group"],
  },
  {
    label: "direction",
    detail: "Set subgraph/diagram direction",
    template: "direction #{LR}",
    lineStart: true,
    aliases: ["direction", "dir"],
  },
  {
    label: "classDef",
    detail: "Define node style class",
    template: "classDef #{className} fill:#{#f9f},stroke:#{#333},stroke-width:2px",
    lineStart: true,
    aliases: ["classdef", "style"],
  },
  {
    label: "style",
    detail: "Style a specific node",
    template: "style #{NodeId} fill:#{#bbf},stroke:#{#333},stroke-width:2px",
    lineStart: true,
    aliases: ["style"],
  },
  {
    label: "click",
    detail: "Interactive node link/callback",
    template: 'click #{NodeId} "#{https://example.com}" "#{Tooltip}"',
    lineStart: true,
    aliases: ["click", "link"],
  },

  // Sequence diagram statements
  {
    label: "participant",
    detail: "Sequence participant",
    template: "participant #{Alias} as #{Label}",
    lineStart: true,
    boost: 6,
    aliases: ["participant", "part"],
  },
  {
    label: "actor",
    detail: "Sequence actor",
    template: "actor #{Alias} as #{Label}",
    lineStart: true,
    boost: 6,
    aliases: ["actor"],
  },
  {
    label: "activate",
    detail: "Activate lifeline",
    template: "activate #{Participant}",
    lineStart: true,
    aliases: ["activate"],
  },
  {
    label: "deactivate",
    detail: "Deactivate lifeline",
    template: "deactivate #{Participant}",
    lineStart: true,
    aliases: ["deactivate"],
  },
  {
    label: "Note over",
    detail: "Sequence note over actor(s)",
    template: "Note over #{Actor}: #{Text}",
    lineStart: true,
    aliases: ["note"],
  },
  {
    label: "Note right of",
    detail: "Sequence note right of actor",
    template: "Note right of #{Actor}: #{Text}",
    lineStart: true,
    aliases: ["note"],
  },
  {
    label: "Note left of",
    detail: "Sequence note left of actor",
    template: "Note left of #{Actor}: #{Text}",
    lineStart: true,
    aliases: ["note"],
  },
  {
    label: "loop",
    detail: "Sequence loop block",
    template: "loop #{Condition}\n  #{A}->>#{B}: #{Message}\nend",
    lineStart: true,
    aliases: ["loop"],
  },
  {
    label: "alt",
    detail: "Sequence alt/else block",
    template: "alt #{Case 1}\n  #{A}->>#{B}: #{Msg 1}\nelse #{Case 2}\n  #{A}->>#{B}: #{Msg 2}\nend",
    lineStart: true,
    aliases: ["alt", "else"],
  },
  {
    label: "opt",
    detail: "Sequence optional block",
    template: "opt #{Description}\n  #{A}->>#{B}: #{Message}\nend",
    lineStart: true,
    aliases: ["opt"],
  },
  {
    label: "par",
    detail: "Sequence parallel block",
    template: "par #{Action 1}\n  #{A}->>#{B}: #{Msg 1}\nand #{Action 2}\n  #{A}->>#{C}: #{Msg 2}\nend",
    lineStart: true,
    aliases: ["par", "parallel"],
  },
  {
    label: "rect",
    detail: "Sequence highlight rectangle",
    template: "rect rgb(200, 230, 255)\n  #{A}->>#{B}: #{Message}\nend",
    lineStart: true,
    aliases: ["rect"],
  },
  {
    label: "autonumber",
    detail: "Sequence auto-number messages",
    template: "autonumber",
    lineStart: true,
    aliases: ["autonumber"],
  },

  // State / Gantt / Git statements
  {
    label: "state",
    detail: "State definition",
    template: 'state "#{Description}" as #{StateId}',
    lineStart: true,
    aliases: ["state"],
  },
  {
    label: "section",
    detail: "Gantt / timeline section",
    template: "section #{Section name}",
    lineStart: true,
    aliases: ["section"],
  },
  {
    label: "title",
    detail: "Diagram title",
    template: "title #{Diagram title}",
    lineStart: true,
    aliases: ["title"],
  },
  {
    label: "dateFormat",
    detail: "Gantt date format",
    template: "dateFormat #{YYYY-MM-DD}",
    lineStart: true,
    aliases: ["dateformat"],
  },
  {
    label: "commit",
    detail: "gitGraph commit",
    template: 'commit id: "#{msg}"',
    lineStart: true,
    aliases: ["commit"],
  },
  {
    label: "branch",
    detail: "gitGraph branch",
    template: "branch #{name}",
    lineStart: true,
    aliases: ["branch"],
  },
  {
    label: "checkout",
    detail: "gitGraph checkout",
    template: "checkout #{name}",
    lineStart: true,
    aliases: ["checkout"],
  },
  {
    label: "merge",
    detail: "gitGraph merge",
    template: "merge #{branch}",
    lineStart: true,
    aliases: ["merge"],
  },

  // Arrows & node shapes (usable anywhere on a Mermaid line)
  {
    label: "-->",
    detail: "Solid arrow",
    template: "--> #{Target}",
    boost: 5,
    aliases: ["arrow", "to"],
  },
  {
    label: "-->|label|",
    detail: "Labeled arrow",
    template: "-->|#{label}| #{Target}",
    boost: 5,
    aliases: ["arrow", "label"],
  },
  {
    label: "-.->",
    detail: "Dotted arrow",
    template: "-.-> #{Target}",
    aliases: ["dotted", "arrow"],
  },
  {
    label: "==>",
    detail: "Thick arrow",
    template: "==> #{Target}",
    aliases: ["thick", "arrow"],
  },
  {
    label: "<-->",
    detail: "Bi-directional arrow",
    template: "<--> #{Target}",
    aliases: ["bidirectional", "arrow"],
  },
  {
    label: "->>",
    detail: "Sequence solid arrow",
    template: "->>#{Target}: #{Message}",
    aliases: ["seq", "arrow"],
  },
  {
    label: "-->>",
    detail: "Sequence dotted reply",
    template: "-->>#{Target}: #{Reply}",
    aliases: ["reply", "arrow"],
  },
  {
    label: "node[Box]",
    detail: "Rectangle node",
    template: "#{id}[#{Label}]",
    aliases: ["node", "box", "rect"],
  },
  {
    label: "node(Round)",
    detail: "Rounded node",
    template: "#{id}(#{Label})",
    aliases: ["node", "round"],
  },
  {
    label: "node{Decision}",
    detail: "Diamond decision node",
    template: "#{id}{#{Condition}}",
    aliases: ["node", "decision", "diamond"],
  },
  {
    label: "node((Circle))",
    detail: "Circle node",
    template: "#{id}((#{Label}))",
    aliases: ["node", "circle"],
  },
  {
    label: "node[(Database)]",
    detail: "Cylinder / DB node",
    template: "#{id}[(#{Database})]",
    aliases: ["node", "db", "database", "cylinder"],
  },
];

function isInsideMermaidFence(doc: Text, pos: number): boolean {
  const currentLine = doc.lineAt(pos).number;
  let inFence: string | null = null;
  let isMermaid = false;

  for (let lineNo = 1; lineNo < currentLine; lineNo++) {
    const text = doc.line(lineNo).text;
    const match = text.match(/^\s*(```+|~~~+)\s*([\w-]*)/);
    if (!match) continue;
    const marker = match[1][0];
    const info = (match[2] ?? "").toLowerCase();
    if (!inFence) {
      inFence = marker;
      isMermaid = info === "mermaid";
    } else if (inFence === marker) {
      inFence = null;
      isMermaid = false;
    }
  }

  return Boolean(inFence && isMermaid);
}

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
 * Suggest Markdown structure (headings, lists, fences, links, MDyar direction
 * comments) outside fenced blocks, and Mermaid syntax inside ```mermaid blocks.
 * Does not complete ordinary prose words.
 */
export function markdownCompletionSource(
  context: CompletionContext,
): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const match = before.match(/(^|\s)([^\s]{0,28})$/);
  const query = match?.[2] ?? "";
  const from = context.pos - query.length;
  const lineStart = /^\s*$/.test(before.slice(0, from - line.from));

  if (!context.explicit && query.length === 0) return null;

  const inMermaid = isInsideMermaidFence(context.state.doc, context.pos);
  const pool = inMermaid ? MERMAID_SNIPPETS : SNIPPETS;

  // Avoid completing while typing normal Persian/Arabic/Latin words mid-sentence.
  if (
    !context.explicit &&
    !inMermaid &&
    !lineStart &&
    /^[\p{L}\p{N}_]+$/u.test(query) &&
    !pool.some((s) => (s.aliases ?? []).some((a) => a.startsWith(query.toLowerCase())))
  ) {
    return null;
  }

  const options = pool
    .filter((snippet) => {
      if (snippet.lineStart && !lineStart && !context.explicit) {
        if (!matchesQuery(query, snippet)) return false;
        if (!inMermaid && !/^[#>*\-|`1.[\]<]/.test(query)) return false;
      }
      return matchesQuery(query, snippet);
    })
    .map(toCompletion);

  if (!options.length) return null;
  return {
    from,
    options,
    validFor: /^[^\s]{0,28}$/,
  };
}

export const markdownAutocompletion = autocompletion({
  override: [markdownCompletionSource],
  activateOnTyping: true,
  icons: false,
  closeOnBlur: true,
});
