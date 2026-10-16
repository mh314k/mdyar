import {
  parseDirDirective,
  scanDirDirectivesInText,
  type DirDirective,
  type TextDirection,
} from "../bidi/direction";

type MdNode = {
  type: string;
  value?: string;
  data?: {
    hProperties?: Record<string, unknown>;
    mdyarDir?: TextDirection;
    [key: string]: unknown;
  };
  children?: MdNode[];
};

const BLOCK_CONTAINERS = new Set([
  "root",
  "blockquote",
  "list",
  "listItem",
  "table",
  "tableRow",
  "tableCell",
  "footnoteDefinition",
]);

function applyDirectiveToStack(stack: TextDirection[], d: DirDirective) {
  if (d.kind === "open") {
    stack.push(d.dir);
  } else if (stack.length > 0) {
    stack.pop();
  }
}

function setForcedDir(node: MdNode, dir: TextDirection) {
  // Never force direction on fenced code or display math blocks.
  if (node.type === "code" || node.type === "math") return;
  node.data ??= {};
  node.data.mdyarDir = dir;
  node.data.hProperties ??= {};
  node.data.hProperties.dir = dir;
  node.data.hProperties.dataMdyarForced = dir;
}

function consumeHtmlDirectives(value: string, stack: TextDirection[]): string | null {
  const single = parseDirDirective(value);
  if (single) {
    applyDirectiveToStack(stack, single);
    return "";
  }
  const { cleaned, directives } = scanDirDirectivesInText(value);
  if (directives.length === 0) return null;
  for (const d of directives) applyDirectiveToStack(stack, d);
  return cleaned;
}

/** Apply leading (and only leading) HTML direction comments, then stop. */
function consumeLeadingDirectives(node: MdNode, stack: TextDirection[]) {
  if (!node.children?.length) return;
  const next: MdNode[] = [];
  let leading = true;
  for (const child of node.children) {
    if (leading && child.type === "html" && typeof child.value === "string") {
      const cleaned = consumeHtmlDirectives(child.value, stack);
      if (cleaned !== null) {
        if (!cleaned.trim()) continue;
        child.value = cleaned;
        leading = false;
        next.push(child);
        continue;
      }
    }
    if (leading && child.type === "text" && !child.value?.trim()) {
      next.push(child);
      continue;
    }
    leading = false;
    next.push(child);
  }
  node.children = next;
}

/** Consume remaining sibling HTML direction comments (typically a trailing close). */
function consumeDirectHtmlDirectives(node: MdNode, stack: TextDirection[]) {
  if (!node.children?.length) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "html" && typeof child.value === "string") {
      const cleaned = consumeHtmlDirectives(child.value, stack);
      if (cleaned !== null) {
        if (!cleaned.trim()) continue;
        child.value = cleaned;
      }
    }
    next.push(child);
  }
  node.children = next;
}

function processChildren(parent: MdNode, stack: TextDirection[]) {
  if (!parent.children?.length) return;
  const kept: MdNode[] = [];

  for (const child of parent.children) {
    if (child.type === "html" && typeof child.value === "string") {
      const cleaned = consumeHtmlDirectives(child.value, stack);
      if (cleaned !== null) {
        if (!cleaned.trim()) continue;
        child.value = cleaned;
      }
    }

    consumeLeadingDirectives(child, stack);
    const active = stack[stack.length - 1];
    if (active) setForcedDir(child, active);
    consumeDirectHtmlDirectives(child, stack);

    if (BLOCK_CONTAINERS.has(child.type)) {
      processChildren(child, stack);
    }

    kept.push(child);
  }

  parent.children = kept;
}

/**
 * Remark plugin that interprets MDyar direction comments:
 *   <!-- mdyar:dir=rtl --> ... <!-- /mdyar:dir -->
 *   <!-- mdyar:dir:rtl O --> ... <!-- mdyar:dir:rtl C -->
 *
 * Consumes the directive comments so they don't appear in output and stamps
 * `data.hProperties.dir` + `data.mdyarDir` on all enclosed Markdown blocks.
 */
export function remarkDirDirective() {
  return (tree: MdNode) => {
    const stack: TextDirection[] = [];
    processChildren(tree, stack);
  };
}
