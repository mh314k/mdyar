import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

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
        markdown(),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "var(--mdyar-font-size)",
            fontFamily: "var(--mdyar-font-editor)",
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
        }),
      ],
      [],
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
      <div className="mdyar-editor" dir="auto">
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
