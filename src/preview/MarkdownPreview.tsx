import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { markdownToHtml } from "./markdown";
import { findPreviewLineAtScroll, scrollPreviewToLine } from "./scrollSync";
import "katex/dist/katex.min.css";

export type PreviewScrollHandle = {
  scrollToLine: (line: number) => void;
  getTopLine: () => number;
};

type Props = {
  source: string;
  onScrollLine?: (line: number) => void;
};

let mermaidReady = false;

async function ensureMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!mermaidReady) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      fontFamily: "inherit",
    });
    mermaidReady = true;
  }
  return mermaid;
}

export const MarkdownPreview = forwardRef<PreviewScrollHandle, Props>(
  function MarkdownPreview({ source, onScrollLine }, ref) {
    const [html, setHtml] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const suppressScroll = useRef(false);
    const onScrollLineRef = useRef(onScrollLine);
    onScrollLineRef.current = onScrollLine;
    const rafRef = useRef(0);

    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const el = containerRef.current;
        if (!el) return;
        suppressScroll.current = true;
        scrollPreviewToLine(el, line);
        window.setTimeout(() => {
          suppressScroll.current = false;
        }, 150);
      },
      getTopLine() {
        const el = containerRef.current;
        return el ? findPreviewLineAtScroll(el) : 1;
      },
    }));

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const rendered = await markdownToHtml(source);
        if (cancelled) return;
        setHtml(rendered);
      })();
      return () => {
        cancelled = true;
      };
    }, [source]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const blocks = el.querySelectorAll("pre > code.language-mermaid");
      void (async () => {
        if (blocks.length > 0) {
          const mermaid = await ensureMermaid();
          let idx = 0;
          for (const code of Array.from(blocks)) {
            const pre = code.parentElement;
            if (!pre) continue;
            const graph = code.textContent ?? "";
            const host = document.createElement("div");
            host.className = "mdyar-mermaid";
            host.dir = "ltr";
            host.setAttribute("data-mermaid-id", `m-${idx++}`);
            const sourceLine = pre.getAttribute("data-source-line");
            if (sourceLine) host.setAttribute("data-source-line", sourceLine);
            try {
              const id = `mdyar-mmd-${crypto.randomUUID()}`;
              const { svg } = await mermaid.render(id, graph);
              host.innerHTML = svg;
              pre.replaceWith(host);
            } catch (err) {
              host.classList.add("mdyar-mermaid-error");
              host.textContent = String(err);
              pre.replaceWith(host);
            }
          }
        }

        el.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th").forEach(
          (node) => {
            if (!node.getAttribute("dir")) node.setAttribute("dir", "auto");
          },
        );
      })();
    }, [html]);

    return (
      <div
        className="mdyar-preview"
        ref={containerRef}
        onScroll={() => {
          const el = containerRef.current;
          if (!el || suppressScroll.current || !onScrollLineRef.current) return;
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => {
            if (!el || suppressScroll.current || !onScrollLineRef.current) return;
            onScrollLineRef.current(findPreviewLineAtScroll(el));
          });
        }}
      >
        <article
          className="mdyar-preview-article"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  },
);
