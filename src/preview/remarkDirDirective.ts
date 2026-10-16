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
}

/**
 * Strip inline `<!-- mdyar:dir=... -->` html nodes inside paragraphs/headings
 * and apply their direction to the enclosing block (and subsequent blocks).
 */
function stripInlineDirectives(node: MdNode, stack: TextDirection[]) {
  if (!node.children?.length) return;
  const nextChildren: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "html" && typeof child.value === "string") {
      const single = parseDirDirective(child.value);
      if (single) {
        applyDirectiveToStack(stack, single);
        continue;
      }
      const { cleaned, directives } = scanDirDirectivesInText(child.value);
      if (directives.length > 0) {
        for (const d of directives) applyDirectiveToStack(stack, d);
        if (!cleaned.trim()) continue;
        child.value = cleaned;
      }
    } else if (child.children?.length) {
      stripInlineDirectives(child, stack);
    }
    nextChildren.push(child);
  }
  node.children = nextChildren;
}

function processChildren(parent: MdNode, stack: TextDirection[]) {
  if (!parent.children?.length) return;
  const kept: MdNode[] = [];

  for (const child of parent.children) {
    if (child.type === "html" && typeof child.value === "string") {
      const single = parseDirDirective(child.value);
      if (single) {
        applyDirectiveToStack(stack, single);
        continue;
      }
      const { cleaned, directives } = scanDirDirectivesInText(child.value);
      if (directives.length > 0) {
        for (const d of directives) applyDirectiveToStack(stack, d);
        if (!cleaned.trim()) continue;
        child.value = cleaned;
      }
    }

    // Inline directives at the start of a paragraph/heading affect this block too.
    stripInlineDirectives(child, stack);

    const active = stack[stack.length - 1];
    if (active) {
      setForcedDir(child, active);
    }

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
