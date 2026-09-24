import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MarkdownEditor,
  type EditorScrollHandle,
} from "../editor/MarkdownEditor";
import {
  MarkdownPreview,
  type PreviewScrollHandle,
} from "../preview/MarkdownPreview";
import { markdownToHtml } from "../preview/markdown";
import { exportHtmlDocument } from "../export/html";
import { exportWordDocument } from "../export/docx";
import {
  drainOsOpenPaths,
  listenForOsOpen,
  openMarkdownFile,
  readMarkdownAtPath,
  runningOnDesktop,
  saveMarkdownFile,
} from "../platform/fs";
import {
  applyThemeToDocument,
  getActiveThemeId,
  isDarkTheme,
  resolveTheme,
  setActiveThemeId,
  type MdyarTheme,
} from "../themes/types";
import { ThemeManager } from "../themes/ThemeManager";
import { getStoredLanguage, type AppLanguage } from "../i18n";
import { SAMPLE_MARKDOWN } from "./sample";
import { Toolbar, type ViewMode } from "./Toolbar";

export function App() {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState(SAMPLE_MARKDOWN);
  const [fileName, setFileName] = useState("welcome.md");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [theme, setTheme] = useState<MdyarTheme>(() => resolveTheme(getActiveThemeId()));
  const [themesOpen, setThemesOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
  );
  const language = (i18n.language?.slice(0, 2) as AppLanguage) || getStoredLanguage();
  const syncScroll = viewMode === "split";

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const loadOsPathsRef = useRef<(paths: string[]) => Promise<void>>(async () => {});

  const editorRef = useRef<EditorScrollHandle>(null);
  const previewRef = useRef<PreviewScrollHandle>(null);
  const driverRef = useRef<"editor" | "preview" | null>(null);
  const lastLineRef = useRef(0);
  const clearDriverTimer = useRef(0);

  const onEditorScrollLine = useCallback(
    (line: number) => {
      if (!syncScroll) return;
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
    (line: number) => {
      if (!syncScroll) return;
      if (driverRef.current === "editor") return;
      if (line === lastLineRef.current) return;
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

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    void runningOnDesktop().then(setIsDesktop);
  }, []);

  loadOsPathsRef.current = async (paths: string[]) => {
    if (paths.length === 0) return;
    if (dirtyRef.current && !window.confirm(t("dialogs.unsavedBody"))) return;
    for (const path of paths) {
      const result = await readMarkdownAtPath(path);
      if (!result) {
        window.alert(t("dialogs.openFailed", { name: path }));
        continue;
      }
      setContent(result.content);
      setFileName(result.name);
      setFilePath(result.path);
      setDirty(false);
      dirtyRef.current = false;
      setViewMode("preview");
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const stop = await listenForOsOpen(() => {
        void drainOsOpenPaths().then((paths) => loadOsPathsRef.current(paths));
      });
      if (cancelled) {
        stop();
        return;
      }
      unlisten = stop;
      const paths = await drainOsOpenPaths();
      if (!cancelled) await loadOsPathsRef.current(paths);
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const onChange = useCallback((value: string) => {
    setContent(value);
    setDirty(true);
  }, []);

  const handleNew = () => {
    if (dirty && !window.confirm(t("dialogs.unsavedBody"))) return;
    setContent("");
    setFileName("untitled.md");
    setFilePath(null);
    setDirty(false);
    setViewMode("edit");
  };

  const handleOpen = async () => {
    if (dirty && !window.confirm(t("dialogs.unsavedBody"))) return;
    const result = await openMarkdownFile();
    if (!result) return;
    setContent(result.content);
    setFileName(result.name);
    setFilePath(result.path);
    setDirty(false);
    setViewMode("preview");
  };

  const handleSave = async (saveAs = false) => {
    try {
      const result = await saveMarkdownFile(content, filePath, fileName, saveAs);
      if (!result) return;
      setFilePath(result.path);
      setFileName(result.name);
      setDirty(false);
    } catch {
      window.alert(t("dialogs.saveFailed"));
    }
  };

  const handleExport = async () => {
    try {
      const htmlBody = await markdownToHtml(content);
      const saved = await exportHtmlDocument({
        title: fileName,
        htmlBody,
        theme,
        filename: fileName,
      });
      if (!saved) return;
    } catch {
      window.alert(t("dialogs.exportFailed"));
    }
  };

  const handleExportWord = async () => {
    try {
      const saved = await exportWordDocument({
        markdown: content,
        filename: fileName,
        language,
      });
      if (!saved) return;
    } catch {
      window.alert(t("dialogs.exportWordFailed"));
    }
  };

  const applyTheme = (next: MdyarTheme) => {
    setTheme(next);
    setActiveThemeId(next.id);
    applyThemeToDocument(next);
  };

  return (
    <div className="mdyar-app">
      <Toolbar
        fileName={fileName}
        dirty={dirty}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onNew={handleNew}
        onOpen={() => void handleOpen()}
        onSave={() => void handleSave(false)}
        onSaveAs={isDesktop ? () => void handleSave(true) : undefined}
        onExportHtml={() => void handleExport()}
        onExportWord={() => void handleExportWord()}
        onThemes={() => setThemesOpen(true)}
        language={language}
      />

      <main
        className={
          viewMode === "split" ? "mdyar-main is-split" : "mdyar-main is-single"
        }
      >
        {(viewMode === "edit" || viewMode === "split") && (
          <MarkdownEditor
            ref={editorRef}
            value={content}
            onChange={onChange}
            dark={isDarkTheme(theme)}
            onScrollLine={syncScroll ? onEditorScrollLine : undefined}
          />
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <MarkdownPreview
            ref={previewRef}
            source={content}
            onScrollLine={syncScroll ? onPreviewScrollLine : undefined}
          />
        )}
      </main>

      <footer className="mdyar-status">
        <span className={dirty ? "is-dirty" : undefined}>
          {dirty ? t("status.unsaved") : t("status.saved")}
        </span>
        <span>{t("status.chars", { count: content.length })}</span>
        {!isDesktop && <span>{t("status.webHint")}</span>}
      </footer>

      {themesOpen && (
        <ThemeManager
          activeId={theme.id}
          onApply={applyTheme}
          onClose={() => setThemesOpen(false)}
        />
      )}
    </div>
  );
}
