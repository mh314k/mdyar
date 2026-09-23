import { useEffect, useRef, useState } from "react";
import { markdownToHtml } from "./markdown";
import "katex/dist/katex.min.css";

type Props = {
  source: string;
  onScrollRatio?: (ratio: number) => void;
  scrollRatio?: number;
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

export function MarkdownPreview({ source, onScrollRatio, scrollRatio }: Props) {
  const [html, setHtml] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const applyingScroll = useRef(false);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el || scrollRatio === undefined) return;
    applyingScroll.current = true;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = max * scrollRatio;
    requestAnimationFrame(() => {
      applyingScroll.current = false;
    });
  }, [scrollRatio]);

  return (
    <div
      className="mdyar-preview"
      ref={containerRef}
      onScroll={(e) => {
        if (applyingScroll.current || !onScrollRatio) return;
        const t = e.currentTarget;
        const max = t.scrollHeight - t.clientHeight;
        onScrollRatio(max > 0 ? t.scrollTop / max : 0);
      }}
    >
      <article
        className="mdyar-preview-article"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
