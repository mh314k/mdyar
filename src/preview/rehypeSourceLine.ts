type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  position?: { start?: { line?: number } };
  children?: HastNode[];
};

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "pre",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "hr",
  "section",
]);

function visit(node: HastNode, fn: (el: HastNode, parent?: HastNode) => void, parent?: HastNode) {
  if (node.type === "element") {
    fn(node, parent);
    for (const child of node.children ?? []) visit(child, fn, node);
  } else if (node.type === "root") {
    for (const child of node.children ?? []) visit(child, fn, node);
  }
}

/** Attach markdown source line numbers for editor ↔ preview scroll sync. */
export function rehypeSourceLine() {
  return (tree: HastNode) => {
    visit(tree, (el, parent) => {
      if (el.tagName === "pre") {
        el.properties ??= {};
        el.properties.dir = "ltr";
      } else if (el.tagName === "code" && parent?.tagName !== "pre") {
        el.properties ??= {};
        el.properties.dir = "auto";
      }

      if (!el.tagName || !BLOCK_TAGS.has(el.tagName)) return;
      const line = el.position?.start?.line;
      if (!line) return;
      el.properties ??= {};
      el.properties.dataSourceLine = line;
    });
  };
}
