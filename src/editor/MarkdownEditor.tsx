import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  markdownSyntaxHighlighting,
  markdownSyntaxThemeVars,
} from "./markdownHighlight";
import { markdownAutocompletion } from "./markdownAutocomplete";
import {
  firstStrongDirection,
  parseDirDirective,
  scanDirDirectivesInText,
  type TextDirection,
} from "../bidi/direction";

export type EditorScrollHandle = {
  scrollToLine: (line: number) => void;
  getTopLine: () => number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onScrollLine?: (line: number) => void;
  dark?: boolean;
};

function topVisibleLine(view: EditorView): number {
  const rect = view.scrollDOM.getBoundingClientRect();
  const y = rect.top + 12;
  for (const dx of [48, 80, 120, rect.width * 0.4]) {
    const pos = view.posAtCoords({ x: rect.left + dx, y });
    if (pos != null) return view.state.doc.lineAt(pos).number;
  }
  const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
  return view.state.doc.lineAt(block.from).number;
}

const lineDirRtl = Decoration.line({ attributes: { dir: "rtl" } });
const lineDirLtr = Decoration.line({ attributes: { dir: "ltr" } });

const FENCE_RE = /^\s*(```+|~~~+)/;

/** Explicit per-line dir from forced MDyar directives or first-strong — avoids Firefox bugs with dir=auto + plaintext. */
function lineDirectionDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  if (view.visibleRanges.length === 0) return builder.finish();

  const lastVisiblePos = view.visibleRanges[view.visibleRanges.length - 1].to;
  const lastVisibleLine = doc.lineAt(lastVisiblePos).number;

  // Walk from line 1 up to lastVisibleLine so `<!-- mdyar:dir=... -->` directives
  // and fenced code blocks above the viewport are respected.
  const stack: TextDirection[] = [];
  let inFence: string | null = null;
  let rangeIdx = 0;

  for (let lineNo = 1; lineNo <= lastVisibleLine; lineNo++) {
    const line = doc.line(lineNo);
    const text = line.text;

    const fenceMatch = text.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) inFence = marker;
      else if (inFence === marker) inFence = null;
    }

    let isDirectiveLine = false;
    if (!inFence) {
      const single = parseDirDirective(text);
      if (single) {
        isDirectiveLine = true;
        if (single.kind === "open") stack.push(single.dir);
        else if (stack.length > 0) stack.pop();
      } else if (text.includes("<!--")) {
        const { directives } = scanDirDirectivesInText(text);
        for (const d of directives) {
          if (d.kind === "open") stack.push(d.dir);
          else if (stack.length > 0) stack.pop();
        }
      }
    }

    while (
      rangeIdx < view.visibleRanges.length &&
      view.visibleRanges[rangeIdx].to < line.from
    ) {
      rangeIdx++;
    }
    const inViewport =
      rangeIdx < view.visibleRanges.length &&
      view.visibleRanges[rangeIdx].from <= line.to;

    if (inViewport) {
      const forced = stack[stack.length - 1];
      const dir: TextDirection =
        inFence || fenceMatch || isDirectiveLine
          ? "ltr"
          : (forced ?? firstStrongDirection(text));
      builder.add(line.from, line.from, dir === "rtl" ? lineDirRtl : lineDirLtr);
    }
  }

  return builder.finish();
}

const perLineDirection = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = lineDirectionDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = lineDirectionDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

function scrollEditorToLine(view: EditorView, line: number) {
  const doc = view.state.doc;
  const clamped = Math.min(Math.max(1, line), doc.lines);
  const target = doc.line(clamped).from;
  view.dispatch({
    effects: EditorView.scrollIntoView(target, { y: "start", yMargin: 0 }),
  });
}

export const MarkdownEditor = forwardRef<EditorScrollHandle, Props>(
  function MarkdownEditor({ value, onChange, onScrollLine, dark = false }, ref) {
    const viewRef = useRef<EditorView | null>(null);
    const suppressScroll = useRef(false);
    const onScrollLineRef = useRef(onScrollLine);
    onScrollLineRef.current = onScrollLine;
    const rafRef = useRef(0);

    const [editorEpoch, setEditorEpoch] = useState(0);

    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const view = viewRef.current;
        if (!view) return;
        suppressScroll.current = true;
        scrollEditorToLine(view, line);
        window.setTimeout(() => {
          suppressScroll.current = false;
        }, 150);
      },
      getTopLine() {
        const view = viewRef.current;
        return view ? topVisibleLine(view) : 1;
      },
    }));

    const extensions = useMemo(
      () => [
        markdown({ base: markdownLanguage }),
        markdownSyntaxHighlighting,
        markdownAutocompletion,
        EditorView.lineWrapping,
        EditorView.perLineTextDirection.of(true),
        perLineDirection,
        EditorView.theme({
          "&": {
            height: "100%",
            direction: "ltr",
            fontSize: "var(--mdyar-font-size)",
            fontFamily: "var(--mdyar-font-editor)",
            ...markdownSyntaxThemeVars(dark),
          },
          ".cm-scroller, .cm-content": {
            direction: "ltr",
          },
          ".cm-scroller": {
            fontFamily: "var(--mdyar-font-editor)",
            lineHeight: "var(--mdyar-line-height)",
          },
          ".cm-content": {
            caretColor: "var(--mdyar-accent)",
          },
          ".cm-gutters": {
            backgroundColor: "var(--mdyar-surface)",
            color: "var(--mdyar-muted)",
            border: "none",
          },
          "&.cm-focused .cm-cursor": {
            borderLeftColor: "var(--mdyar-accent)",
          },
          ".cm-activeLine": {
            backgroundColor: "color-mix(in srgb, var(--mdyar-accent) 8%, transparent)",
          },
          ".cm-tooltip.cm-tooltip-autocomplete": {
            backgroundColor: "var(--mdyar-surface)",
            color: "var(--mdyar-fg)",
            border: "1px solid var(--mdyar-border)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--mdyar-fg) 12%, transparent)",
          },
          ".cm-tooltip.cm-tooltip-autocomplete > ul": {
            fontFamily: "var(--mdyar-font-editor)",
            fontSize: "0.92em",
          },
          ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
            padding: "0.35rem 0.65rem",
            lineHeight: "1.35",
          },
          ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
            background: "color-mix(in srgb, var(--mdyar-accent) 18%, var(--mdyar-surface))",
            color: "var(--mdyar-fg)",
          },
          ".cm-completionLabel": {
            fontFamily: "var(--mdyar-font-editor)",
          },
          ".cm-completionDetail": {
            color: "var(--mdyar-muted)",
            fontStyle: "normal",
            marginInlineStart: "0.55rem",
          },
        }),
      ],
      [dark],
    );

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      const onScroll = () => {
        if (suppressScroll.current || !onScrollLineRef.current) return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (suppressScroll.current || !onScrollLineRef.current) return;
          onScrollLineRef.current(topVisibleLine(view));
        });
      };

      view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        view.scrollDOM.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(rafRef.current);
      };
    }, [editorEpoch]);

    return (
      <div className="mdyar-editor" dir="ltr">
        <CodeMirror
          value={value}
          height="100%"
          theme={dark ? "dark" : "light"}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          extensions={extensions}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
            setEditorEpoch((n) => n + 1);
          }}
        />
      </div>
    );
  },
);
