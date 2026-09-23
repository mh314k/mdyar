import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onScrollRatio?: (ratio: number) => void;
  scrollRatio?: number;
};

export function MarkdownEditor({ value, onChange, onScrollRatio, scrollRatio }: Props) {
  const viewRef = useRef<EditorView | null>(null);
  const applyingScroll = useRef(false);

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
      EditorView.domEventHandlers({
        scroll: (_e, view) => {
          if (applyingScroll.current || !onScrollRatio) return false;
          const scroller = view.scrollDOM;
          const max = scroller.scrollHeight - scroller.clientHeight;
          onScrollRatio(max > 0 ? scroller.scrollTop / max : 0);
          return false;
        },
      }),
    ],
    [onScrollRatio],
  );

  useEffect(() => {
    const view = viewRef.current;
    if (!view || scrollRatio === undefined) return;
    const scroller = view.scrollDOM;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const next = max * scrollRatio;
    if (Math.abs(scroller.scrollTop - next) <= 2) return;
    applyingScroll.current = true;
    scroller.scrollTop = next;
    requestAnimationFrame(() => {
      applyingScroll.current = false;
    });
  }, [scrollRatio]);

  return (
    <div className="mdyar-editor" dir="auto">
      <CodeMirror
        value={value}
        height="100%"
        theme="light"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
      />
    </div>
  );
}
