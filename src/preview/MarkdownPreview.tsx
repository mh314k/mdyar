import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { markdownToHtml } from "./markdown";
import { findPreviewLineAtScroll, scrollPreviewToLine } from "./scrollSync";
import { applyExplicitDir } from "../bidi/direction";
import { PreviewDirControls } from "./PreviewDirControls";
import "katex/dist/katex.min.css";

export type PreviewScrollHandle = {
  scrollToLine: (line: number) => void;
  getTopLine: () => number;
};

type Props = {
  source: string;
  onChange?: (value: string) => void;
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
  function MarkdownPreview({ source, onChange, onScrollLine }, ref) {
    const [html, setHtml] = useState("");
    const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const setContainer = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      setPreviewEl(el);
    };
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

      el.querySelectorAll(
        "p, ul, ol, li, h1, h2, h3, h4, h5, h6, blockquote, table, td, th, figcaption",
      ).forEach((node) => {
        applyExplicitDir(node);
      });

      const blocks = el.querySelectorAll("pre > code.language-mermaid");
      if (blocks.length === 0) return;

      let cancelled = false;
      void (async () => {
        const mermaid = await ensureMermaid();
        let idx = 0;
        for (const code of Array.from(blocks)) {
          if (cancelled) return;
          const pre = code.parentElement;
          if (!pre || !el.contains(pre)) continue;
          const graph = code.textContent ?? "";
          const host = document.createElement("div");
          host.className = "mdyar-mermaid";
          host.dir = "ltr";
          host.setAttribute("data-mermaid-id", `m-${idx++}`);
          const sourceLine = pre.getAttribute("data-source-line");
          if (sourceLine) host.setAttribute("data-source-line", sourceLine);
          const sourceEnd = pre.getAttribute("data-source-end-line");
          if (sourceEnd) host.setAttribute("data-source-end-line", sourceEnd);
          const id = `mdyar-mmd-${crypto.randomUUID()}`;
          try {
            const { svg } = await mermaid.render(id, graph);
            if (cancelled) return;
            host.innerHTML = svg;
            pre.replaceWith(host);
          } catch (err) {
            // Mermaid leaves an orphan `#d<id>` / `#<id>` error element in the body on syntax errors.
            document.getElementById(id)?.remove();
            document.getElementById(`d${id}`)?.remove();
            if (cancelled) return;
            host.classList.add("mdyar-mermaid-error");
            host.textContent = String(err);
            pre.replaceWith(host);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [html]);

    return (
      <div
        className="mdyar-preview"
        ref={setContainer}
        onClick={(event) => {
          const anchor = (event.target as Element | null)?.closest?.("a");
          const root = containerRef.current;
          if (!anchor || !root?.contains(anchor)) return;
          const href = anchor.getAttribute("href");
          if (!href?.startsWith("#") || href.length < 2) return;
          let id = href.slice(1);
          try {
            id = decodeURIComponent(id);
          } catch {
            return;
          }
          const target = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
          if (!target) return;
          event.preventDefault();
          target.scrollIntoView({ block: "center", inline: "nearest" });
        }}
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
          dir="ltr"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {onChange && html && (
          <PreviewDirControls
            container={previewEl}
            source={source}
            onChange={onChange}
          />
        )}
      </div>
    );
  },
);
