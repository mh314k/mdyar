import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { MarkdownPreview } from "../preview/MarkdownPreview";
import { markdownToHtml } from "../preview/markdown";
import { exportHtmlDocument } from "../export/html";
import { openMarkdownFile, saveMarkdownFile, runningOnDesktop } from "../platform/fs";
import {
  applyThemeToDocument,
  getActiveThemeId,
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
  const [scrollRatio, setScrollRatio] = useState(0);
  const [scrollSource, setScrollSource] = useState<"editor" | "preview" | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const language = (i18n.language?.slice(0, 2) as AppLanguage) || getStoredLanguage();

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    void runningOnDesktop().then(setIsDesktop);
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

  const handleSave = async () => {
    const result = await saveMarkdownFile(content, filePath, fileName);
    if (!result) return;
    setFilePath(result.path);
    setFileName(result.name);
    setDirty(false);
  };

  const handleExport = async () => {
    const htmlBody = await markdownToHtml(content);
    await exportHtmlDocument({
      title: fileName,
      htmlBody,
      theme,
      filename: fileName,
    });
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
        onSave={() => void handleSave()}
        onExportHtml={() => void handleExport()}
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
            value={content}
            onChange={onChange}
            onScrollRatio={(r) => {
              setScrollSource("editor");
              setScrollRatio(r);
            }}
            scrollRatio={scrollSource === "preview" ? scrollRatio : undefined}
          />
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <MarkdownPreview
            source={content}
            onScrollRatio={(r) => {
              setScrollSource("preview");
              setScrollRatio(r);
            }}
            scrollRatio={scrollSource === "editor" ? scrollRatio : undefined}
          />
        )}
      </main>

      <footer className="mdyar-status">
        <span>{dirty ? t("status.unsaved") : t("status.saved")}</span>
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
