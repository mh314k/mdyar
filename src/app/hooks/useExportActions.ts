import { useCallback } from "react";
import type { MutableRefObject } from "react";
import { exportHtmlDocument } from "../../export/html";
import { exportWordDocument } from "../../export/docx";
import { markdownToHtml } from "../../preview/markdown";
import type { MdyarTheme } from "../../themes/types";
import type { AppLanguage } from "../../i18n";
import { getActiveDocument, type WorkspaceSnapshot } from "../documents";

type Options = {
  workspaceRef: MutableRefObject<WorkspaceSnapshot>;
  theme: MdyarTheme;
  language: AppLanguage;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useExportActions({ workspaceRef, theme, language, t }: Options) {
  const handleExport = useCallback(async () => {
    const doc = getActiveDocument(workspaceRef.current);
    if (!doc) return;
    try {
      const htmlBody = await markdownToHtml(doc.content);
      const saved = await exportHtmlDocument({
        title: doc.fileName,
        htmlBody,
        theme,
        filename: doc.fileName,
      });
      if (!saved) return;
    } catch {
      window.alert(t("dialogs.exportFailed"));
    }
  }, [workspaceRef, theme, t]);

  const handleExportWord = useCallback(async () => {
    const doc = getActiveDocument(workspaceRef.current);
    if (!doc) return;
    try {
      const saved = await exportWordDocument({
        markdown: doc.content,
        filename: doc.fileName,
        language,
      });
      if (!saved) return;
    } catch {
      window.alert(t("dialogs.exportWordFailed"));
    }
  }, [workspaceRef, language, t]);

  return { handleExport, handleExportWord };
}
