import { useCallback, useRef } from "react";
import type { EditorScrollHandle } from "../../editor/MarkdownEditor";
import type { PreviewScrollHandle } from "../../preview/MarkdownPreview";

export function useScrollSync(syncScroll: boolean, onChange: (value: string) => void) {
  const editorRef = useRef<EditorScrollHandle>(null);
  const previewRef = useRef<PreviewScrollHandle>(null);
  const driverRef = useRef<"editor" | "preview" | null>(null);
  const lastLineRef = useRef(0);
  const clearDriverTimer = useRef(0);
  const ignoreEditorSyncUntil = useRef(0);

  const onEditorScrollLine = useCallback(
    (line: number) => {
      if (!syncScroll) return;
      if (performance.now() < ignoreEditorSyncUntil.current) return;
      if (driverRef.current === "preview") return;
      if (line === lastLineRef.current) return;
      lastLineRef.current = line;
      driverRef.current = "editor";
      previewRef.current?.scrollToLine(line);
      window.clearTimeout(clearDriverTimer.current);
      clearDriverTimer.current = window.setTimeout(() => {
        if (driverRef.current === "editor") driverRef.current = null;
      }, 180);
    },
    [syncScroll],
  );

  const onPreviewScrollLine = useCallback(
    (line: number, force = false) => {
      if (!syncScroll) return;
      if (!force && driverRef.current === "editor") return;
      if (!force && line === lastLineRef.current) return;
      lastLineRef.current = line;
      driverRef.current = "preview";
      editorRef.current?.scrollToLine(line);
      window.clearTimeout(clearDriverTimer.current);
      clearDriverTimer.current = window.setTimeout(() => {
        if (driverRef.current === "preview") driverRef.current = null;
      }, 180);
    },
    [syncScroll],
  );

  const onPreviewChange = useCallback(
    (value: string) => {
      ignoreEditorSyncUntil.current = performance.now() + 400;
      onChange(value);
    },
    [onChange],
  );

  return {
    editorRef,
    previewRef,
    onEditorScrollLine,
    onPreviewScrollLine,
    onPreviewChange,
  };
}
