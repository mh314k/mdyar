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
import { AboutDialog } from "./AboutDialog";
import { appWindowTitle } from "./meta";

/** Keeps each filename on its own line so mixed LTR/RTL text does not reorder the prompt. */
function closeUnsavedMessage(prompt: string, names: string[]): string {
  return `${prompt}\n\n${names.join("\n")}`;
}

export function App() {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState(SAMPLE_MARKDOWN);
  const [fileName, setFileName] = useState("welcome.md");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [theme, setTheme] = useState<MdyarTheme>(() => resolveTheme(getActiveThemeId()));
  const [themesOpen, setThemesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
  );
  const language = (i18n.language?.slice(0, 2) as AppLanguage) || getStoredLanguage();
  const syncScroll = viewMode === "split";

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const fileNameRef = useRef(fileName);
  fileNameRef.current = fileName;
  const contentRef = useRef(content);
  contentRef.current = content;
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  const loadOsPathsRef = useRef<(paths: string[]) => Promise<void>>(async () => {});
  const saveRef = useRef<(saveAs?: boolean) => Promise<boolean>>(async () => false);

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

  useEffect(() => {
    const title = appWindowTitle();
    document.title = title;
    if (!isDesktop) return;
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setTitle(title);
    })();
  }, [isDesktop]);

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

  const handleSave = async (saveAs = false): Promise<boolean> => {
    try {
      const result = await saveMarkdownFile(
        contentRef.current,
        filePathRef.current,
        fileNameRef.current,
        saveAs,
      );
      if (!result) return false;
      setFilePath(result.path);
      setFileName(result.name);
      setDirty(false);
      dirtyRef.current = false;
      return true;
    } catch {
      window.alert(t("dialogs.saveFailed"));
      return false;
    }
  };
  saveRef.current = handleSave;

  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    let prompting = false;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { message } = await import("@tauri-apps/plugin-dialog");
      const win = getCurrentWindow();
      const stop = await win.onCloseRequested(async (event) => {
        if (!dirtyRef.current) return;
        if (prompting) {
          event.preventDefault();
          return;
        }
        prompting = true;
        try {
          const yes = i18n.t("dialogs.yes");
          const no = i18n.t("dialogs.no");
          const cancel = i18n.t("dialogs.cancel");
          const choice = await message(
            closeUnsavedMessage(i18n.t("dialogs.closeUnsavedBody"), [
              fileNameRef.current,
            ]),
            {
              title: i18n.t("dialogs.closeUnsavedTitle"),
              kind: "warning",
              buttons: {
                yes,
                no,
                cancel,
              },
            },
          );
          if (disposed) {
            event.preventDefault();
            return;
          }
          const saveAndClose = choice === yes || choice === "Yes";
          const discardAndClose = choice === no || choice === "No";
          if (saveAndClose) {
            const saved = await saveRef.current(false);
            if (!saved || disposed) {
              event.preventDefault();
              return;
            }
            // Allow the pending close to finish (destroy after this handler).
            return;
          }
          if (discardAndClose) {
            dirtyRef.current = false;
            setDirty(false);
            return;
          }
          event.preventDefault();
        } finally {
          prompting = false;
        }
      });
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [isDesktop, i18n]);

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
        onAbout={() => setAboutOpen(true)}
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
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
